import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { Box, Divider, Paper, Typography, IconButton } from "@mui/material";
import GoogleLoginButton from "../Components/GoogleLoginButton";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFCMToken } from "../services/notificationService";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import homeBg from "../assets/Home bg image.png";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "",
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
      const { email, password , role  } = formData;

      const response = await axiosInstance.post(
        "/auth/signIn",
        { email, password, role },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("User_id", response.data.User_id);
        localStorage.setItem("IsLogin", true);
        localStorage.setItem("name", response.data.name);

        toast.success("Logged in successfully!");

        // generating fcm token
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          await axiosInstance.post("/notification/fcm-token", {
            fcmToken
          });
        }

        switch (response.data.role) {
          case "site engineer":
            navigate("/engineer/home");
            break;
          case "manager":
            navigate("/contractor/home");
            break;
          default:
            navigate("/");
        }
      }
    } catch (e) {
      const status = e.response?.status;
      const data = e.response?.data;
      console.log(e)

      if (status === 422) return toast.error(data.error[0].msg);
      if (status === 404) return toast.error(data.error);
      if (status === 401) return toast.error(data.error);

      toast.error("Something went wrong. Please try again.");
      console.log(e);
    }

    setValidated(true);
  }

  return (
    <Box className="auth-shell auth-login">
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
              {t("auth.welcome_back")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
            {t("auth.sign_in_continue")}
            </Typography>
          </Box>

          <form
            noValidate
            className={validated ? "was-validated" : ""}
            onSubmit={handleSubmit}
          >
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
               Please enter a valid email.
              </div>
            </Box>


            {/* Password */}
            <Box mb={3}>
              <label className="form-label fw-semibold">{t("auth.password")}</label>
              <Box sx={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder={t("auth.password_placeholder")}
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


            {/* Role */}
            <Box mb={2}>
              <label className="form-label fw-semibold">{t("auth.role")}</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                {t("auth.choose_role")}
                </option>
                <option value="site engineer">{t("auth.site_engineer")}</option>
                <option value="manager">{t("auth.manager")}</option>
              </select>
              <div className="invalid-feedback">
                Please select a role.
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
              {t("auth.sign_in")}
            </button>
          </form>

          {/* Divider */}
          <Box className="auth-divider">
            <Divider sx={{ flex: 1 ,backgroundColor:"text.primary"}} />
            <Typography sx={{ px: 2, fontWeight:"bold" }} variant="body2" color="text.primary">
              OR
            </Typography>
            <Divider sx={{ flex: 1 ,backgroundColor:"text.primary"}} />
          </Box>

          {/* Google Login */}
          <Box className="auth-google">
            <GoogleLoginButton />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
