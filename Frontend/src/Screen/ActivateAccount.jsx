
import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import Input from "../Components/atoms/Input/Input";
import axiosInstance from "../utils/axiosInstance";
import "./ActivateAccount.css";

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordPattern =
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/;

  const passwordState =
    password.length === 0
      ? undefined
      : passwordPattern.test(password)
        ? "success"
        : "error";

  const confirmPasswordState =
    confirmPassword.length === 0
      ? undefined
      : confirmPassword === password && passwordPattern.test(password)
        ? "success"
        : "error";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This activation link is missing its token. Please contact your administrator for a valid link."
      );
      return;
    }

    if (!passwordPattern.test(password)) {
      setError(
        "Use at least 8 characters, including one letter and one number. Spaces are not allowed."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/auth/activate-account",
        { token, password }
      );

      setSuccess(
        response.data?.message ||
          "Your account is activated. You can now sign in."
      );

      window.setTimeout(() => {
        navigate("/Login", { replace: true });
      }, 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to activate your account. Please try again or request a new link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="activate-account-shell">
      <Box
        component="form"
        className="activate-account-card"
        onSubmit={handleSubmit}
        noValidate
      >
        <Box className="activate-account-header">
          <Box className="activate-account-icon" aria-hidden="true">
            <svg
              className="activate-account-icon-svg"
              viewBox="0 0 32 32"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M 20 3 C 15.054688 3 11 7.054688 11 12 C 11 12.519531 11.085938 12.976563 11.15625 13.4375 L 3.28125 21.28125 L 3 21.59375 L 3 29 L 10 29 L 10 26 L 13 26 L 13 23 L 16 23 L 16 20.03125 C 17.179688 20.609375 18.554688 21 20 21 C 24.945313 21 29 16.945313 29 12 C 29 7.054688 24.945313 3 20 3 Z M 20 5 C 23.855469 5 27 8.144531 27 12 C 27 15.855469 23.855469 19 20 19 C 18.789063 19 17.542969 18.644531 16.59375 18.125 L 16.34375 18 L 14 18 L 14 21 L 11 21 L 11 24 L 8 24 L 8 27 L 5 27 L 5 22.4375 L 12.90625 14.5 L 13.28125 14.15625 L 13.1875 13.625 C 13.085938 13.023438 13 12.488281 13 12 C 13 8.144531 16.144531 5 20 5 Z M 22 8 C 20.894531 8 20 8.894531 20 10 C 20 11.105469 20.894531 12 22 12 C 23.105469 12 24 11.105469 24 10 C 24 8.894531 23.105469 8 22 8 Z"
                fill="currentColor"
              />
            </svg>
          </Box>

          <Typography variant="h4" className="activate-account-title">
            Activate your account
          </Typography>

          <Typography variant="body2" className="activate-account-subtitle">
            Set up your password to get started with <span>ODRAOPS</span>.
          </Typography>
        </Box>

        {!token && (
          <Box role="alert" className="activate-account-alert activate-account-alert--warning">
            This activation link is missing its token. Please use the complete link provided by your administrator.
          </Box>
        )}

        {error && (
          <Box role="alert" className="activate-account-alert activate-account-alert--error">
            {error}
          </Box>
        )}

        {success && (
          <Box role="status" className="activate-account-alert activate-account-alert--success">
            {success}
          </Box>
        )}

        <Box className="activate-account-form">
          <Input
            id="activate-password"
            label="New password"
            name="password"
            type="password"
            className="activate-account-field"
            placeholder="Enter a new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            validationState={passwordState}
            validationMessage={
              passwordState === "error" && password
                ? "Use at least 8 characters, including a letter and a number."
                : undefined
            }
          />

          <Input
            id="activate-confirm-password"
            label="Confirm password"
            name="confirmPassword"
            type="password"
            className="activate-account-field"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            validationState={confirmPasswordState}
            validationMessage={
              confirmPasswordState === "error" && confirmPassword
                ? "Passwords do not match."
                : undefined
            }
          />

          <button
            type="submit"
            className="activate-account-submit"
            disabled={loading || !token || Boolean(success)}
          >
            <span>Activate account</span>
            <span aria-hidden="true" className="activate-account-submit-icon">
              →
            </span>
          </button>
        </Box>
      </Box>
    </Box>
  );
}
