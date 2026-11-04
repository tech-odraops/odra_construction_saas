import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import Button from "../../Components/atoms/Button/Button";
import Input from "../../Components/atoms/Input/Input";
import SiteEngineerNavbar from "../../Components/SiteEngineerNavbar";
import "./Profile.css";

export default function SiteEngineerProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem("siteEngineerProfileImage") || "");
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  useEffect(() => {
    const savedImage = localStorage.getItem("siteEngineerProfileImage");
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, []);
  const [formData, setFormData] = useState({
    name: localStorage.getItem("name"),
    role: localStorage.getItem("role") || "Site Engineer",
    email: localStorage.getItem("email") || "",
    phone: localStorage.getItem("phone") || "+91",
  });

  const initials = (formData.name || "SE")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SE";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setProfileImage(result);
      localStorage.setItem("siteEngineerProfileImage", result);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem("name", formData.name.trim() || "Site Engineer");
    localStorage.setItem("role", formData.role.trim() || "Site Engineer");
    localStorage.setItem("email", formData.email.trim());
    localStorage.setItem("phone", formData.phone.trim());
    navigate("/engineer/home");
  };

  return (
    <Box className="site-engineer-profile-page">
      <SiteEngineerNavbar />

      <Box className="site-engineer-profile-shell">
        <Box className="site-engineer-profile-header">
          <ArrowBackRoundedIcon className="site-engineer-profile-header__back" onClick={() => navigate(-1)} />
          <Box className="site-engineer-profile-header__content">
            <Typography variant="h4">Edit Profile</Typography>
            <Typography className="site-engineer-profile-header__subtitle">
              Update your personal information and account details.
            </Typography>
          </Box>
        </Box>

        <Box component="form" className="site-engineer-profile-grid" onSubmit={handleSubmit}>
          <Box className="site-engineer-profile-photo-card">
            <Box className="site-engineer-profile-avatar-wrap">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="site-engineer-profile-avatar" />
              ) : (
                <Box className="site-engineer-profile-avatar site-engineer-profile-avatar--fallback">{initials}</Box>
              )}
            </Box>

            <Button
              type="button"
              className="site-engineer-profile-upload__button"
              variant="contained"
              size="compact"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<PhotoCameraOutlinedIcon sx={{ fontSize: 20 }} />}
            />

            <Typography className="site-engineer-profile-upload__label">Upload Profile Photo</Typography>
            <Typography className="site-engineer-profile-upload__hint">JPG, PNG up to 5MB</Typography>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </Box>

          <Box className="site-engineer-profile-form-card">
            <Input
              id="name"
              label="Name"
              name="name"
              type="text"
              required
              value={formData.name}
              className="site-engineer-profile-input"
              onChange={handleChange}
            />

            <Input
              id="role"
              label="Current role"
              name="role"
              select
              value={formData.role}
              className="site-engineer-profile-input"
              onChange={handleChange}
            >
              <option value="Site Engineer">Site Engineer</option>
              <option value="Project Engineer">Site Supervisor</option>
            </Input>

            <Input
              id="email"
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              placeholder="Add email address"
              icon="plus-math"
              iconColor={formData.email ? "#9aa3b2" : "var(--color-profile-accent, #f97316)"}
              className={`site-engineer-profile-input site-engineer-profile-input--email ${formData.email ? "site-engineer-profile-input--filled" : ""} ${isEmailFocused ? "site-engineer-profile-input--focused" : ""}`}
              onChange={handleChange}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />

            <Input
              id="phone"
              label="Phone number"
              name="phone"
              type="tel"
              value={formData.phone}
              className="site-engineer-profile-input site-engineer-profile-input--phone"
              validationState={formData.phone ? "success" : undefined}
              endIcon="check-mark"
              onChange={handleChange}
            />

            <Box className="site-engineer-profile-actions">
              <Button type="button" variant="outlined" className="site-engineer-profile-cancel" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" className="site-engineer-profile-submit">
                Update Profile
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
