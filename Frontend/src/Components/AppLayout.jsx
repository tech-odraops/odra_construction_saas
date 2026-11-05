import React, { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Box, Drawer, Typography } from "@mui/material";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import AppNavbar from "./AppNavbar";

const contractorMenuItems = [
  { label: "Home", path: "/founder/home", Icon: HomeOutlinedIcon },
  { label: "Projects", path: "/founder/project", Icon: FolderOpenOutlinedIcon },
  { label: "Team", path: "/founder/workers", Icon: GroupsOutlinedIcon },
  { label: "Add New Project", path: "/founder/add-project", Icon: AddCircleRoundedIcon },
  { label: "Add Worker", path: "/founder/add-worker", Icon: PersonAddAltOutlinedIcon },
];

function PageLoader() {
  return (
    <Box sx={{ minHeight: "calc(100vh - var(--dashboard-header-height))", display: "grid", placeItems: "center", color: "var(--color-dashboard-muted-text)" }}>
      Loading...
    </Box>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const isSiteEngineer = pathname.startsWith("/site-engineer");
  const menuItems = isSiteEngineer
    ? [
      { label: "Home", path: "/site-engineer/home", Icon: HomeOutlinedIcon },
      { label: "Projects", path: "/site-engineer/projects", Icon: FolderOpenOutlinedIcon },
    ]
    : contractorMenuItems;

  const sidebar = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "var(--dashboard-header-height)", minHeight: 0, boxSizing: "border-box", p: 1.5, borderBottom: "1px solid var(--color-dashboard-border)" }}>
        <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", fontWeight: 700, fontSize: 20 }}>
          {isSiteEngineer ? "S" : "B"}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{isSiteEngineer ? "Site Engineer" : "Founder"}</Typography>
      </Box>
      <Box component="nav" sx={{ p: 1.5 }}>
        {menuItems.map(({ label, path, Icon }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`);
          return (
            <Box
              key={path}
              component={Link}
              to={path}
              onClick={() => setMobileSidebarOpen(false)}
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
    </>
  );

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
          {sidebar}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <AppNavbar
            dashboard
            siteEngineer={isSiteEngineer}
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
            showMobileDrawer={false}
          />
          <Box component="main" sx={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--color-dashboard-border)" }}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Box>
      <Drawer
        anchor="left"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        <Box sx={{ width: "var(--dashboard-sidebar-width)", height: "100%", bgcolor: "var(--color-dashboard-sidebar-surface)" }}>
          {sidebar}
        </Box>
      </Drawer>
    </Box>
  );
}
