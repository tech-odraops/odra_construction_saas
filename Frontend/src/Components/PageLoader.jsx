import { Box } from "@mui/material";

export default function PageLoader() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - var(--dashboard-header-height))",
        display: "grid",
        placeItems: "center",
        color: "var(--color-dashboard-muted-text)"
      }}
    >
      Loading...
    </Box>
  );
}
