import * as React from 'react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { SitemarkIcon } from './CustomIcons';
import Button from '../../../../../Components/atoms/Button/Button';

import { useEffect } from 'react';
import axiosInstance from "../../../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
}));

export default function SignInCard() {
  const navigate = useNavigate();

  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');

  const [formData, setFormData] = React.useState({
    email: "",
    password: ""
  });


  useEffect(() => {
    const checkValidity = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axiosInstance.get("/token/me");

        // ✅ ONLY admin redirected
        if (res.status === 200 && res.data.role === "admin") {
          navigate("/admin/dashboard");
        }

      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
      }
    };

    checkValidity();
  }, []);

  // ✅ controlled input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateInputs = () => {
    let isValid = true;

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!formData.password || formData.password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 6 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    return isValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateInputs()) return;

    try {
      const res = await axiosInstance.post("/admin/login", formData);

      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", "admin");

        toast.success("Admin logged in");

        navigate("/admin/dashboard");
      }

    } catch (err) {
      const message = err.response?.data?.error || "Login failed";

      // ✅ SHOW ERROR UNDER FIELD
      if (message.toLowerCase().includes("password")) {
        setPasswordError(true);
        setPasswordErrorMessage(message);
      } else if (message.toLowerCase().includes("email")) {
        setEmailError(true);
        setEmailErrorMessage(message);
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Card variant="outlined">
      {/* <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <SitemarkIcon />
      </Box> */}

      <Typography
        component="h1"
        variant="h4"
        sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
      >
        Login 
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
      >
        {/* EMAIL */}
        <FormControl>
          <FormLabel htmlFor="email">Email</FormLabel>
          <TextField
            error={emailError}
            helperText={emailErrorMessage}
            id="email"
            type="email"
            name="email"
            placeholder="your@email.com"
            autoComplete="email"
            autoFocus
            required
            fullWidth
            variant="outlined"
            color={emailError ? 'error' : 'primary'}
            value={formData.email}
            onChange={handleChange}
          />
        </FormControl>

        {/* PASSWORD */}
        <FormControl>
          <FormLabel htmlFor="password">Password</FormLabel>
          <TextField
            error={passwordError}
            helperText={passwordErrorMessage}
            name="password"
            placeholder="••••••"
            type="password"
            id="password"
            autoComplete="current-password"
            required
            fullWidth
            variant="outlined"
            color={passwordError ? 'error' : 'primary'}
            value={formData.password}
            onChange={handleChange}
          />
        </FormControl>

        <Button type="submit" fullWidth variant="contained">
          Login
        </Button>
      </Box>
    </Card>
  );
}