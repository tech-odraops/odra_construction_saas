
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  InputAdornment,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  VisibilityOutlined,
  VisibilityOffOutlined,
} from "@mui/icons-material";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordPattern =
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/;

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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "#f5f6f8",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 460,
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          border: "1px solid #e5e7eb",
        }}
      >
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: 1 }}
          >
            ODRA<span style={{ color: "#F97316" }}>OPS</span>
          </Typography>

          <Typography variant="h5" sx={{ mt: 3, fontWeight: 700 }}>
            Activate your account
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Set a password to finish setting up your Founder account.
          </Typography>
        </Box>

        {!token && (
          <Box
            role="alert"
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "#fff4e5",
              color: "#9a3412",
            }}
          >
            This activation link is missing its token. Please use the
            complete link provided by your administrator.
          </Box>
        )}

        {error && (
          <Box
            role="alert"
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "#fef2f2",
              color: "#b91c1c",
              fontSize: 14,
            }}
          >
            {error}
          </Box>
        )}

        {success && (
          <Box
            role="status"
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "#f0fdf4",
              color: "#166534",
              fontSize: 14,
            }}
          >
            {success}
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Create password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            margin="normal"
            required
            inputProps={{ minLength: 8 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((value) => !value)}
                    edge="end"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <VisibilityOffOutlined />
                    ) : (
                      <VisibilityOutlined />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Confirm password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            margin="normal"
            required
            inputProps={{ minLength: 8 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    edge="end"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <VisibilityOffOutlined />
                    ) : (
                      <VisibilityOutlined />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1, mb: 2 }}
          >
            Use at least 8 characters, including a letter and a number.
          </Typography>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !token || Boolean(success)}
            sx={{
              mt: 1,
              py: 1.3,
              bgcolor: "#F97316",
              "&:hover": { bgcolor: "#ea580c" },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Activate account"
            )}
          </Button>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          Already activated? <Link to="/Login">Sign in</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
