import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { Box, Divider, Paper, Typography, IconButton } from "@mui/material";
import GoogleLoginButton from "../Components/GoogleLoginButton";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import homeBg from "../assets/Home bg image.png";

export default function Signup() {
  const navigate = useNavigate();
  const { t } = useTranslation();


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      setValidated(true);
      event.stopPropagation();
      return;
    }

    try {
      const { name, email, password } = formData;

      const res = await axiosInstance.post(
        "/auth/signUp",
        { name, email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("User_id", res.data.User_id);
        localStorage.setItem("IsLogin", true);
        localStorage.setItem("name", res.data.name);
        toast.success("Account created successfully!");

        navigate("/contractor/home");
      }
    } catch (e) {
      console.log(e)
      const status = e.response?.status;

      if (status === 409) {
        toast.error(e.response.data.error);
        navigate("/Login");
        return;
      }

      if (status === 422) {
        toast.error(e.response.data.error?.[0]?.msg || "Validation error");
        return;
      }

      toast.error("Something went wrong. Please try again.");
      console.log(e);
    }

    setValidated(true);
  }

  return (
    <Box className="auth-shell auth-signup">
      <Box className="auth-visual-panel">
        <Box className="auth-wordmark"><span>ODRA</span><span>OPS</span></Box>
        <Box className="auth-visual-copy">
          <Typography component="h1">BUILDING<br /><span>SMARTER</span><br />TOMORROW</Typography>
          <Typography><strong>ODRAOPS</strong> delivers reliable construction, infrastructure, and <em>resource management</em> solutions.</Typography>
        </Box>
      </Box>

      <Box className="auth-form-panel" style={{ "--auth-bg": `url("${homeBg}")` }}>
        <Box className="auth-dots" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <i key={i} />)}</Box>
        <Paper elevation={0} className="auth-card">
          {/* Header */}
          <Box className="auth-card-header">
            <Typography variant="h5" fontWeight={700}>
              {t("auth.create_account")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("auth.signup_start")}
            </Typography>
          </Box>

          <form
            noValidate
            className={validated ? "was-validated" : ""}
            onSubmit={handleSubmit}
          >
            {/* Name */}
            <Box mb={2}>
              <label className="form-label fw-semibold">{t("auth.full_name")}</label>
              <input
                name="name"
                type="text"
                className="form-control"
                placeholder={t("auth.name_placeholder")}
                value={formData.name}
                onChange={handleChange}
                required
                minLength={2}
              />
              <div className="invalid-feedback">
                Please provide a valid name.
              </div>
            </Box>

            {/* Email */}
            <Box mb={2}>
              <label className="form-label fw-semibold">{t("auth.email")}</label>
              <input
                name="email"
                type="email"
                className="form-control"
                placeholder={t("auth.email_placeholder")}
                value={formData.email}
                onChange={handleChange}
                required
              />
              <div className="invalid-feedback">
                Please provide a valid email.
              </div>
            </Box>

            {/* Password */}
            <Box mb={2}>
              <label className="form-label fw-semibold">{t("auth.password")}</label>
              <Box sx={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder={t("auth.min_password_placeholder")}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={5}
                  style={{ paddingRight: 40 }}
                />
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", color: "#6d7378", p: 0.5 }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Box>
              <div className="invalid-feedback">
                Password must be at least 5 characters.
              </div>
            </Box>

            {/* Submit */}
            <button
              type="submit"
              className="btn w-100 fw-semibold auth-submit"
              style={{
                backgroundColor: "#F97316",
                color: "#fff",
              }}
            >
              {t("auth.sign_up")}
            </button>
          </form>

          <Box className="auth-divider">
            <Divider sx={{ flex: 1 }} />
            <Typography sx={{ px: 2 }} variant="body2" color="text.secondary">
              OR
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Box className="auth-google">
            <GoogleLoginButton />
          </Box>
          <Typography className="auth-switch">Already have an account? <Link to="/Login">Sign in</Link></Typography>
        </Paper>
      </Box>
    </Box>
  );
}
