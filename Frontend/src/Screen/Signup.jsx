import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { Box, Divider, Paper, Typography } from "@mui/material";
import GoogleLoginButton from "../Components/GoogleLoginButton";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Input from "../Components/atoms/Input/Input";
import { emailValidator, minLengthValidator, requiredValidator } from "../utils/validation";
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
  const [validationStates, setValidationStates] = useState({});
const [validationMessages, setValidationMessages] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationStates((prev) => ({
      ...prev,
      [name]: validateSignupField(name, value) ? "success" : "error"
    }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setValidationStates((prev) => ({
      ...prev,
      [name]: validateSignupField(name, event.target.value) ? "success" : "error"
    }));
  }

  function validateSignupField(name, value) {
    if (name === "name") {
      return requiredValidator(value) && minLengthValidator(value, 2);
    }
    if (name === "email") {
let required = requiredValidator(value);
      console.log("required", required);
      setValidationMessages((prev) => ({
        ...prev,
        [name]: required ? undefined : t("validation.required"),
      }));
      if (!required) return required;
      let emailValid = emailValidator(value);
      console.log("emailValid", emailValid);
      setValidationMessages((prev) => ({
        ...prev,
        [name]: emailValid ? undefined : t("validation.invalid_email"),
      }));
      if (!emailValid) return emailValid;
      return required && emailValid;    }
    if (name === "password") {
      return requiredValidator(value) && minLengthValidator(value, 5);
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextValidationStates = {
      name: validateSignupField("name", formData.name) ? "success" : "error",
      email: validateSignupField("email", formData.email) ? "success" : "error",
      password: validateSignupField("password", formData.password) ? "success" : "error"
    };
    setValidationStates(nextValidationStates);

    if (Object.values(nextValidationStates).includes("error")) {
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
              <Input
                id="signup-name"
                label={t("auth.full_name")}
                name="name"
                type="text"
                className="auth-input"
                placeholder={t("auth.name_placeholder")}
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                minLength={2}
                validationState={validationStates.name}
              />
              <div className="invalid-feedback">
                Please provide a valid name.
              </div>
            </Box>

            {/* Email */}
            <Box mb={2}>
              <Input
                id="signup-email"
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
                Please provide a valid email.
              </div>
            </Box>

            {/* Password */}
            <Box mb={2}>
              <Input
                id="signup-password"
                label={t("auth.password")}
                name="password"
                type="password"
                className="auth-input"
                placeholder={t("auth.min_password_placeholder")}
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
