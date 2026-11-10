import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Divider from "@mui/material/Divider";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import SocialBar from "./SocialBar";

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Select,
  MenuItem
} from "@mui/material";
import Button from "./atoms/Button/Button";

import MenuIcon from "@mui/icons-material/Menu";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import axiosInstance from "../utils/axiosInstance";

function getOwnerInitials() {
  const ownerName = (localStorage.getItem("organizationName") || localStorage.getItem("name"))?.trim();
  if (!ownerName) return "P";
  return ownerName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function AppNavbar({
  dashboard = false,
  siteEngineer = false,
  sticky = false,
  showMobileNavigation = true,
  showMobileDrawer = showMobileNavigation,
  onMobileMenuClick,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const [avatarName, setAvatarName] = React.useState(() => localStorage.getItem("name") || "");

  React.useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (event.detail?.name) setAvatarName(event.detail.name);
      setAvatarUrl(event.detail?.avatarUrl || null);
    };
    window.addEventListener("profile:updated", handleProfileUpdate);
    return () => window.removeEventListener("profile:updated", handleProfileUpdate);
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!siteEngineer) localStorage.removeItem("organizationLogo");
    const endpoint = siteEngineer ? "/profile/me" : "/profile/organization";
    axiosInstance.get(endpoint).then(({ data }) => {
      if (!active) return;
      const person = siteEngineer ? data.profile : data.organization;
      const url = siteEngineer ? person?.profilePictureUrl : person?.logoUrl;
      setAvatarUrl(url || null);
      if (person?.name) setAvatarName(person.name);
    }).catch(() => {});
    return () => { active = false; };
  }, [siteEngineer]);

  const avatarInitials = avatarName.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || (siteEngineer ? "S" : getOwnerInitials());

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("IsLogin");
    localStorage.removeItem("User_id");
    localStorage.removeItem("name");
    localStorage.removeItem("organizationId");
    localStorage.removeItem("role");
    navigate("/home");
  };

  const menuItems = siteEngineer
    ? [{ label: t("navbar.all_projects"), path: "/site-engineer/projects", icon: FolderOpenOutlinedIcon }]
    : [
      { label: t("navbar.add_project"), path: "/founder/add-project", icon: AddCircleOutlineIcon },
      { label: t("navbar.all_projects"), path: "/founder/project", icon: FolderOpenOutlinedIcon },
      { label: t("navbar.workers"), path: "/founder/workers", icon: GroupsOutlinedIcon },
      { label: t("navbar.add_worker"), path: "/founder/add-worker", icon: PersonAddAltOutlinedIcon },
    ];
  const homePath = siteEngineer ? "/site-engineer/home" : "/founder/home";

  return (
    <>
      {/* TOP BAR */}
      <AppBar position="static" className={`contractor-appbar${sticky ? " contractor-appbar--sticky" : ""}`} sx={{ backgroundColor: "var(--palette-background-paper)", color: "var(--color-organization-profile-nav-text)", height: "var(--dashboard-header-height)", boxSizing: "border-box", border: dashboard ? "1px solid var(--color-dashboard-border)" : 0, borderLeft: dashboard ? 0 : undefined, borderBottom: "1px solid var(--color-dashboard-border)", borderRadius: 0, boxShadow: "none", m: 0 }}>
        <Toolbar className="contractor-toolbar" sx={{ justifyContent: 'space-between', height: "100%", minHeight: "0 !important", boxSizing: "border-box", px: { xs: 1.5, md: 2.5 } }}>
          {/* Mobile Menu Icon */}
          {showMobileNavigation && (
            <Button
              iconOnly
              edge="start"
              color="inherit"
              className="icon-button-atom--mobile-menu contractor-mobile-menu"
              sx={{ display: { xs: "inline-flex", md: "none" } }}
              onClick={() => {
                if (onMobileMenuClick) {
                  onMobileMenuClick();
                } else {
                  setOpenDrawer(true);
                }
              }}
            >
              <MenuIcon />
            </Button>
          )}

          {/* Logo */}
          <Box className="contractor-wordmark" sx={{ display: { xs: "none", md: dashboard ? "none" : "flex" }, alignItems: "center", flexGrow: 1 }} onClick={() => navigate(homePath)}>
            ODRA<span>OPS</span>
          </Box>

          {dashboard && (
            <Typography sx={{ display: { xs: "none", md: "block" }, fontWeight: 700, fontSize: 20, color: "var(--color-organization-profile-nav-text)", mr: "auto" }}>
              Dashboard
            </Typography>
          )}

          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>



            {/* Desktop Menu */}
            <Box className="contractor-desktop-menu" sx={{ display: { xs: "none", md: dashboard ? "none" : "flex" }, gap: 3 }}>
              {menuItems.map((item) => (
                  <Typography
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    sx={{
                      color: "var(--color-organization-profile-nav-item-text)",
                      textDecoration: "none",
                      fontWeight: "var(--font-weight-medium)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <item.icon sx={{ mr: 1, fontSize: "var(--icon-md)", color: "var(--palette-primary-main)" }} />{item.label}

                  </Typography>
              ))}
            </Box>

            {/* Avatar */}
            <Avatar
              className="contractor-profile-avatar"
              component={Link}
              to={siteEngineer ? "/site-engineer/profile" : "/founder/organization-profile"}
              aria-label={siteEngineer ? "Edit user profile" : "Edit organization profile"}
              sx={{
                bgcolor: "var(--color-organization-profile-avatar-surface)",
                color: "var(--palette-primary-main)",
                ml: 2.5,
                mr: 1.5,
                width: 40,
                height: 40,
                fontSize: "var(--font-body-font-size)",
                border: 0,
                cursor: "pointer",
                display: { xs: dashboard ? "none" : "flex", md: "flex" },
                "&:hover": { bgcolor: "var(--color-organization-profile-nav-avatar-hover)" },
                "&:focus-visible": { outline: "var(--control-focus-outline-width) solid var(--palette-primary-main)", outlineOffset: "var(--control-focus-outline-offset)" },
              }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitials}
            </Avatar>

            {/* Logout Button */}
            <Button
              variant="contained"
              onClick={logout}
              sx={{
                display: { xs: "none", md: "inline-flex" },
                backgroundColor: "var(--palette-primary-main)",
                color: "var(--palette-primary-contrast-text)",
                fontWeight: "var(--font-weight-semibold)",
                "&:hover": {
                  backgroundColor: "var(--palette-primary-dark)",
                },
              }}
            >
              {t("navbar.logout")}
            </Button>

            <Select
              size="small"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    "& .MuiMenuItem-root:hover": { backgroundColor: "var(--palette-action-hover)" },
                    "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "var(--palette-action-selected)", color: "var(--palette-primary-main)" },
                    "& .MuiMenuItem-root.Mui-selected:hover": { backgroundColor: "var(--palette-action-selected)" },
                  },
                },
              }}
              sx={{
                display: { xs: "none", md: "flex" },
                ml: 1.5,
                backgroundColor: "var(--palette-background-paper)",
                borderRadius: 1,
                height: 32
              }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="hi">हिं</MenuItem>
              <MenuItem value="or">ଓଡ଼ିଆ</MenuItem>
            </Select>
          </Box>
        </Toolbar>
      </AppBar>

      {showMobileDrawer && (
        <Drawer
          anchor="left"
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
        >
        <Box
          sx={{
            width: 260,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: 2,
          }}
        >
          {/* TOP SECTION */}
          <Box>
            {/* LOGO */}
            <Box sx={{ textAlign: "start", mb: 2 }}>
              <div className="contractor-wordmark drawer-wordmark"
                onClick={() => {
                  navigate("/founder/home");
                  setOpenDrawer(false);
                }}
              >ODRA<span>OPS</span></div>
            </Box>

            {/* DIVIDER */}
            <Divider sx={{ mb: 2, bgcolor: "divider" }} />

            {/* MENU ITEMS */}
            <List>
              {menuItems.map((item) => (
                  <ListItem
                    key={item.label}
                    onClick={() => {
                      navigate(item.path);
                      setOpenDrawer(false);
                    }}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                      fontWeight: "var(--font-weight-medium)",
                      }}
                    />

                  </ListItem>
              ))}
            </List>
          </Box>

          {/* BOTTOM SECTION */}
          <Box>
            {/* USER + LOGOUT */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <Avatar
                className="contractor-profile-avatar"
                component={Link}
                to={siteEngineer ? "/site-engineer/profile" : "/founder/organization-profile"}
                onClick={() => {
                  setOpenDrawer(false);
                }}
                aria-label={siteEngineer ? "Edit user profile" : "Edit organization profile"}
                sx={{ bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", border: 0, cursor: "pointer" }}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitials}
              </Avatar>

              <Button
                variant="contained"
                onClick={logout}
                sx={{
                  flex: 1,
                  fontWeight: 600,
                }}
              >
                {t("navbar.logout")}
              </Button>
            </Box>

            {/* DIVIDER */}
            <Divider sx={{ mb: 1, bgcolor: "divider" }} />

            {/* SOCIAL BAR */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 2,
              }}
            >
              <SocialBar colourStyle={{ color: "var(--palette-text-primary)" }} />
            </Box>
          </Box>
        </Box>
        </Drawer>
      )}
    </>
  );
}
