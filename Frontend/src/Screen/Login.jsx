import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { Box, Divider, Paper, Typography } from "@mui/material";
import GoogleLoginButton from "../Components/GoogleLoginButton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFCMToken } from "../services/notificationService";
import Input from "../Components/atoms/Input/Input";
import {
  emailValidator,
  minLengthValidator,
  requiredValidator,
} from "../utils/validation";
import signInBg from "../assets/Sign in bg.png";
import usePopup from "../contexts/usePopup";
import { Icon } from "../Components/atoms/Icon/Icon";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const initialResetToken = searchParams.get("token") || "";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [validated, setValidated] = useState(false);
  const { showPopup, dismissPopup } = usePopup();
  const [validationStates, setValidationStates] = useState({});
  const [validationMessages, setValidationMessages] = useState({});
  const [recoveryStep, setRecoveryStep] = useState(
    initialResetToken ? "password" : "signin",
  );
  const [resetToken] = useState(initialResetToken);
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });

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
        localStorage.setItem("organizationId",response.data.organizationId);

        showPopup({
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

        const roleDestinations = {
          Founder: "/contractor/home",
          "Site Engineer": "/engineer/home",
        };

        const destination = roleDestinations[response.data.role];

        if (!destination) {
          localStorage.removeItem("token");
          localStorage.removeItem("User_id");
          localStorage.removeItem("IsLogin");
          localStorage.removeItem("name");

          showPopup({
            variant: "error",
            title: "Role not configured",
            message:
              "Your account is authenticated, but a dashboard has not been configured for your role.",
          });

          return;
        }

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
      showPopup({
        variant: "error",
        title: "Login failed",
        message: message || "Please check your details and try again.",
      });
      console.log(e)

      console.log(e); 
    }

    setValidated(true);
  }

  function beginPasswordRecovery() {
    dismissPopup();
    setRecoveryStep("email");
    setValidationStates({});
    setValidated(false);
  }

  function returnToSignIn() {
    navigate("/Login", { replace: true });
    setRecoveryStep("signin");
    dismissPopup();
    setValidationStates({});
    setValidated(false);
  }

  function showRecoveryError(error, fallbackMessage) {
    showPopup({
      variant: "error",
      title: "Password reset failed",
      message: error.response?.data?.message || fallbackMessage,
    });
  }

  async function sendResetLink(event) {
    event.preventDefault();
    if (!requiredValidator(formData.email) || !emailValidator(formData.email)) {
      setValidationStates((current) => ({ ...current, email: "error" }));
      setValidationMessages((current) => ({
        ...current,
        email: !requiredValidator(formData.email)
          ? t("validation.required")
          : t("validation.invalid_email"),
      }));
      return;
    }

    try {
      await axiosInstance.post("/auth/forgot-password", {
        email: formData.email,
      });
      setRecoveryStep("emailSent");
      dismissPopup();
    } catch (error) {
      showRecoveryError(error, "Unable to send a reset link. Please try again.");
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const { password, confirmPassword } = passwordData;
    const validPassword =
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/.test(
        password,
      );

    if (!validPassword) {
      showPopup({
        variant: "error",
        title: "Invalid password",
        message:
          "Use at least 8 characters with at least one letter and one number. Spaces are not allowed.",
      });
      return;
    }
    if (password !== confirmPassword) {
      showPopup({
        variant: "error",
        title: "Passwords do not match",
        message: "Enter the same password in both fields.",
      });
      return;
    }

    try {
      await axiosInstance.post("/auth/reset-password", {
        token: resetToken,
        newPassword: password,
      });
      dismissPopup();
      setRecoveryStep("success");
    } catch (error) {
      showRecoveryError(error, "Unable to reset your password. Please try again.");
    }
  }

  const recoveryHeaders = {
    signin: [t("auth.welcome_back"), t("auth.sign_in_continue")],
    email: ["Forgot password?", "Enter your email address to receive a reset link."],
    emailSent: [
      "Check your email",
      `If an account exists for ${formData.email}, a password reset link has been sent.`,
    ],
    password: ["Create new password", "Choose a new password for your account."],
    success: ["Password reset successfully", "Your password has been updated."],
  };

  return (
    <Box className="auth-shell auth-login">
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
          <Box className="auth-card-header">
            <Typography variant="h5" fontWeight={700}>
              {recoveryHeaders[recoveryStep][0]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {recoveryHeaders[recoveryStep][1]}
            </Typography>
          </Box>

          {recoveryStep === "signin" && (
            <>
              <form
                noValidate
                className={validated ? "was-validated" : ""}
                onSubmit={handleSubmit}
              >
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

                <Box mb={1}>
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
                <Box className="auth-recovery-link">
                  <button type="button" onClick={beginPasswordRecovery}>
                    Forgot password?
                  </button>
                </Box>
                <button
                  type="submit"
                  className="btn w-100 fw-semibold auth-submit"
                  style={{ backgroundColor: "#F97316", color: "#fff" }}
                >
                  {t("auth.sign_in")}
                </button>
              </form>

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
              <Box className="auth-google">
                <GoogleLoginButton />
              </Box>
            </>
          )}

          {recoveryStep === "email" && (
            <form onSubmit={sendResetLink}>
              <Box mb={2}>
                <Input
                  id="recovery-email"
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
              </Box>
              <button type="submit" className="btn w-100 fw-semibold auth-submit">
                Send Reset Link
              </button>
              <Box className="auth-recovery-link">
                <button type="button" onClick={returnToSignIn}>
                  Back to Sign In
                </button>
              </Box>
            </form>
          )}

          {recoveryStep === "emailSent" && (
            <Box className="auth-reset-success">
              <Typography variant="body2" color="text.secondary" align="center">
                Check your inbox and follow the link to choose a new password.
              </Typography>
              <button
                type="button"
                className="btn w-100 fw-semibold auth-submit"
                onClick={returnToSignIn}
              >
                Back to Sign In
              </button>
            </Box>
          )}

          {recoveryStep === "password" && (
            <form onSubmit={resetPassword}>
              <Box mb={2}>
                <Input
                  id="new-password"
                  label="New password"
                  type="password"
                  className="auth-input"
                  placeholder="Enter new password"
                  required
                  value={passwordData.password}
                  onChange={(event) =>
                    setPasswordData((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </Box>
              <Box mb={3}>
                <Input
                  id="confirm-password"
                  label="Confirm password"
                  type="password"
                  className="auth-input"
                  placeholder="Confirm new password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(event) =>
                    setPasswordData((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </Box>
              <button type="submit" className="btn w-100 fw-semibold auth-submit">
                Reset Password
              </button>
            </form>
          )}

          {recoveryStep === "success" && (
            <Box className="auth-reset-success">
              <Icon
                variant="check-mark"
                size="xxl"
                gradient="primary"
                label="Password reset successful"
              />
              <button
                type="button"
                className="btn w-100 fw-semibold auth-submit"
                onClick={returnToSignIn}
              >
                Go to Sign In
              </button>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
