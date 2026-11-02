import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f6f7fb",
        px: 2,
      }}
    >
      <Stack spacing={3} alignItems="center" textAlign="center">

        {/* ICON */}
        <ErrorOutlineIcon sx={{ fontSize: 80, color: "#ffcc00" }} />

        {/* 404 TEXT */}
        <Typography variant="h2" fontWeight={700}>
          404
        </Typography>

        {/* TITLE */}
        <Typography variant="h5" fontWeight={600}>
          Page Not Found
        </Typography>

        {/* DESCRIPTION */}
        <Typography variant="body1" color="white" maxWidth={400}>
          The page you’re looking for doesn’t exist or has been moved.
        </Typography>

      </Stack>
    </Box>
  );
}