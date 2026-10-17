import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { Box, Divider, Paper, Typography } from "@mui/material";
import GoogleLoginButton from "../Components/GoogleLoginButton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFCMToken } from "../services/notificationService";
import Input from "../Components/atoms/Input/Input";
import {
  emailValidator,
  minLengthValidator,
  requiredValidator,
} from "../utils/validation";
import signInBg from "../assets/Sign in bg.png";
import Popup from "../Components/atoms/Popup/Popup";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [validated, setValidated] = useState(false);
  const [popup, setPopup] = useState(null);
  const [validationStates, setValidationStates] = useState({});
  const [validationMessages, setValidationMessages] = useState({});
  
  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationStates((prev) => ({
      ...prev,
      [name]: validateLoginField(name, value) ? "success" : "error",
    }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setValidationStates((prev) => ({
      ...prev,
      [name]: validateLoginField(name, event.target.value)
        ? "success"
        : "error",
    }));
  }

  function validateLoginField(name, value) {
    if (name === "email") {
      let required = requiredValidator(value);
      setValidationMessages((prev) => ({
        ...prev,
        [name]: required ? undefined : t("validation.required"),
      }));
      if (!required) return required;
      let emailValid = emailValidator(value);
      setValidationMessages((prev) => ({
        ...prev,
        [name]: emailValid ? undefined : t("validation.invalid_email"),
      }));
      if (!emailValid) return emailValid;
      return required && emailValid;
    }
    if (name === "password") {
      return requiredValidator(value) && minLengthValidator(value, 5);
    }
    if (name === "role") return requiredValidator(value);
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextValidationStates = {
      email: validateLoginField("email", formData.email) ? "success" : "error",
      password: validateLoginField("password", formData.password)
        ? "success"
        : "error",
      role: validateLoginField("role", formData.role) ? "success" : "error",
    };
    setValidationStates(nextValidationStates);

    if (Object.values(nextValidationStates).includes("error")) {
      setValidated(true);
      event.stopPropagation();
      return;
    }

    try {
      const { email, password } = formData;

      const response = await axiosInstance.post(
        "/auth/signIn",
        { email, password },
        { headers: { "Content-Type": "application/json" } },
      );

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("User_id", response.data.User_id);
        localStorage.setItem("IsLogin", true);
        localStorage.setItem("name", response.data.name);

        setPopup({
          variant: "success",
          title: "Success!",
          message: "Logged in successfully.",
        });

        // generating fcm token
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          await axiosInstance.post("/notification/fcm-token", {
            fcmToken,
          });
        }

        const destination =
          response.data.role === "site engineer"
            ? "/engineer/home"
            : response.data.role === "manager"
              ? "/contractor/home"
              : "/";
        window.setTimeout(() => navigate(destination), 1200);
      }
    } catch (e) {
      const status = e.response?.status;
      const data = e.response?.data;
      console.log(e);

      const message =
        status === 422
          ? data?.error?.[0]?.msg
          : status === 404 || status === 401
            ? data?.error
            : "Something went wrong. Please try again.";
      setPopup({
        variant: "error",
        title: "Login failed",
        message: message || "Please check your details and try again.",
      });
    }

    setValidated(true);
  }

  return (
    <Box className="auth-shell auth-login">
      {popup && (
        <Box
          sx={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 1400,
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          <Popup
            {...popup}
            onClose={() => setPopup(null)}
            style={{ maxWidth: "100%" }}
          />
        </Box>
      )}
      <Box className="auth-visual-panel">
        <Box className="auth-wordmark">
          <span>ODRA</span>
          <span>OPS</span>
        </Box>
        <Box className="auth-visual-copy">
          <Typography component="h1">
            BUILDING
            <br />
            <span>SMARTER</span>
            <br />
            TOMORROW
          </Typography>
          <Typography>
            <strong>ODRAOPS</strong> delivers reliable construction, <br></br>{" "}
            infrastructure, and <em>resource management</em> solutions.
          </Typography>
        </Box>
      </Box>

      <Box
        className="auth-form-panel"
        style={{ "--auth-bg": `url("${signInBg}")` }}
      >
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
              <Input
                id="login-email"
                label={t("auth.email")}
                name="email"
                type="email"
                className="auth-input"
                placeholder={t("auth.email_placeholder")}
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                validationState={validationStates.email}
                validationMessage={validationMessages.email}
              />
              <div className="invalid-feedback">
                Please enter a valid email.
              </div>
            </Box>

            {/* Password */}
            <Box mb={3}>
              <Input
                id="login-password"
                label={t("auth.password")}
                name="password"
                type="password"
                className="auth-input"
                placeholder={t("auth.password_placeholder")}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                minLength={5}
                validationState={validationStates.password}
              />
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
              {t("auth.sign_in")}
            </button>
          </form>

          {/* Divider */}
          <Box className="auth-divider">
            <Divider sx={{ flex: 1, backgroundColor: "text.primary" }} />
            <Typography
              sx={{ px: 2, fontWeight: "bold" }}
              variant="body2"
              color="text.primary"
            >
              OR
            </Typography>
            <Divider sx={{ flex: 1, backgroundColor: "text.primary" }} />
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
