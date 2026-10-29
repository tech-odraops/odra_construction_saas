import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import ContractorNavbar from "./ContractorNavbar";

const menuItems = [
  { label: "Projects", path: "/contractor/project", Icon: FolderOpenOutlinedIcon },
  { label: "Team", path: "/contractor/workers", Icon: GroupsOutlinedIcon },
  { label: "Add New Project", path: "/contractor/add-project", Icon: AddCircleRoundedIcon },
];

export default function ContractorLayout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--color-dashboard-canvas)", color: "var(--color-organization-profile-text)" }}>
      <Box sx={{ display: "flex", alignItems: "stretch", minHeight: "100vh" }}>
        <Box
          component="aside"
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            width: "var(--dashboard-sidebar-width)",
            flexShrink: 0,
            bgcolor: "var(--color-dashboard-sidebar-surface)",
            border: "1px solid var(--color-dashboard-border)",
            borderRight: 0,
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "var(--dashboard-header-height)", minHeight: 0, boxSizing: "border-box", p: 1.5, borderBottom: "1px solid var(--color-dashboard-border)" }}>
            <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", fontWeight: 700, fontSize: 20 }}>
              B
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>My Organisation</Typography>
          </Box>
          <Box component="nav" sx={{ p: 1.5 }}>
            {menuItems.map(({ label, path, Icon }) => {
              const active = pathname === path || pathname.startsWith(`${path}/`);
              return (
                <Box
                  key={path}
                  component={Link}
                  to={path}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.5,
                    py: 1.25,
                    mb: 0.75,
                    borderRadius: 1.5,
                    textDecoration: "none",
                    color: active ? "var(--color-dashboard-nav-active-border)" : "var(--color-organization-profile-nav-item-text)",
                    bgcolor: active ? "var(--color-dashboard-nav-active)" : "transparent",
                    borderLeft: active ? "3px solid var(--color-dashboard-nav-active-border)" : "3px solid transparent",
                    fontWeight: active ? 700 : 500,
                    "&:hover": { bgcolor: "var(--color-dashboard-nav-active)" },
                  }}
                >
                  <Box component={Icon} sx={{ fontSize: 20 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: "inherit" }}>{label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <ContractorNavbar dashboard />
          <Box component="main" sx={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--color-dashboard-border)" }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
