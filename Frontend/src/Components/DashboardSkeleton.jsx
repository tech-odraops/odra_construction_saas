import React from "react";
import { Box, Typography } from "@mui/material";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";

const shimmerSx = {
  position: "relative",
  overflow: "hidden",
  bgcolor: "var(--color-dashboard-border)",
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    transform: "translateX(-100%)",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent)",
    animation: "dashboard-shimmer 1.4s infinite",
  },
};

export function DashboardStatsSkeleton({ stats }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
      {stats.map(({ label, Icon: StatIcon, color, tint }) => (
        <Box key={label} sx={{ minHeight: 116, display: "flex", alignItems: "center", gap: 2, p: 2, bgcolor: "var(--color-dashboard-header-surface)", borderRadius: 2, border: "1px solid var(--color-dashboard-border)" }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: tint, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Box component={StatIcon} sx={{ color, fontSize: 30 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{label}</Typography>
            <Box sx={{ ...shimmerSx, width: 48, height: 32, borderRadius: 1, mt: .5 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function RecentProjectSkeleton() {
  return (
    <Box sx={{ minHeight: 70, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 42, height: 42, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <BusinessRoundedIcon />
      </Box>
      <Box sx={{ ...shimmerSx, width: "45%", height: 17, borderRadius: 1 }} />
      <Box sx={{ ...shimmerSx, width: 72, height: 24, borderRadius: 8, ml: "auto" }} />
    </Box>
  );
}

export function RecentProjectsSkeleton() {
  return (
    <Box sx={{ overflow: "hidden", border: "1px solid var(--color-dashboard-border)", borderRadius: 2, bgcolor: "var(--color-dashboard-header-surface)" }}>
      <RecentProjectSkeleton />
    </Box>
  );
}
