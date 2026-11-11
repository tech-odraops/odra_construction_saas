import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, CircularProgress, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import Button from "../../Components/atoms/Button/Button";
import usePopup from "../../contexts/usePopup";
import axiosInstance from "../../utils/axiosInstance";
import "../Founder/OrganizationProfile.css";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function SiteEngineerProfile() {
  const navigate = useNavigate();
  const { showPopup } = usePopup();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({ name: "", email: "", phoneNumber: "", role: "Site Engineer", profilePictureUrl: null });
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    axiosInstance.get("/profile/me")
      .then(({ data }) => {
        if (!active) return;
        const result = data.profile || {};
        setProfile({ name: result.name || "", email: result.email || "", phoneNumber: result.phoneNumber || "", role: result.role || "Site Engineer", profilePictureUrl: result.profilePictureUrl || null });
      })
      .catch((error) => {
        if (active) showPopup({ variant: "error", title: "Could not load profile", message: error.response?.data?.message || "Please try again." });
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [showPopup]);

  function changeField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function selectImage(file) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showPopup({ variant: "error", title: "Unsupported file", message: "Choose a JPG, PNG, or WEBP image." });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showPopup({ variant: "error", title: "Image too large", message: "Choose an image that is 5 MB or smaller." });
      return;
    }
    setSelectedImage(file);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) {
      showPopup({ variant: "error", title: "Required information missing", message: "Name and email are required." });
      return;
    }
    const formData = new FormData();
    formData.append("name", profile.name.trim());
    formData.append("email", profile.email.trim());
    formData.append("phoneNumber", profile.phoneNumber.trim());
    if (selectedImage) formData.append("profilePicture", selectedImage);
    setSaving(true);
    try {
      const { data } = await axiosInstance.patch("/profile/me", formData);
      const result = data.profile || {};
      setProfile((current) => ({ ...current, ...result, phoneNumber: result.phoneNumber || "" }));
      setSelectedImage(null);
      localStorage.setItem("name", result.name || profile.name.trim());
      window.dispatchEvent(new CustomEvent("profile:updated", { detail: { name: result.name || profile.name.trim(), avatarUrl: result.profilePictureUrl || null } }));
      showPopup({ variant: "success", title: "Changes saved", message: data.message || "Your profile has been updated." });
    } catch (error) {
      const errors = error.response?.data?.errors;
      const message = errors?.map((item) => item.message).join(" ") || error.response?.data?.message || "Could not update your profile. Please try again.";
      showPopup({ variant: "error", title: "Save failed", message });
    } finally {
      setSaving(false);
    }
  }

  const selectedImageUrl = useMemo(() => selectedImage ? URL.createObjectURL(selectedImage) : null, [selectedImage]);
  useEffect(() => () => { if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl); }, [selectedImageUrl]);
  const pictureUrl = selectedImageUrl || profile.profilePictureUrl;

  return (
    <main className="organization-profile site-engineer-profile">
      <Box className="organization-profile__heading">
        <Button iconOnly border={false} hover={false} aria-label="Back to dashboard" onClick={() => navigate(-1)} className="organization-profile__back"><ArrowBackRoundedIcon /></Button>
        <Box>
          <Typography component="h1">My Profile</Typography>
          <Typography component="p">Manage your personal information and profile picture.</Typography>
        </Box>
      </Box>
      <Box component="form" className="organization-profile__form" onSubmit={handleSave}>
        {loading ? <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <>
          <Box className="site-engineer-profile__content">
            <button className="site-engineer-profile__picture-picker" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload profile picture">
              <Avatar src={pictureUrl || undefined} sx={{ width: 128, height: 128, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)" }}><PersonOutlineRoundedIcon sx={{ fontSize: 64 }} /></Avatar>
              <span className="organization-profile__logo-title">Change Profile Picture</span>
              <span className="organization-profile__logo-hint">PNG, JPG or WEBP (up to 5 MB)</span>
            </button>
            <Box className="site-engineer-profile__fields">
              <TextField label="Full Name" value={profile.name} onChange={(event) => changeField("name", event.target.value)} required fullWidth inputProps={{ maxLength: 120 }} />
              <TextField label="Email Address" type="email" value={profile.email} onChange={(event) => changeField("email", event.target.value)} required fullWidth />
              <TextField label="Phone Number" type="tel" value={profile.phoneNumber} onChange={(event) => changeField("phoneNumber", event.target.value)} fullWidth />
              <TextField label="Role" value={profile.role} fullWidth disabled />
            </Box>
          </Box>
          <Button type="submit" variant="contained" disabled={saving} className="organization-profile__save">{saving ? "Saving…" : "Save Changes"}</Button>
        </>}
      </Box>
      <input ref={fileInputRef} className="organization-profile__file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = ""; }} />
    </main>
  );
}
