import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Divider from "@mui/material/Divider";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import SocialBar from "./SocialBar";

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Select,
  MenuItem
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";

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

function getOrganizationLogo() {
  try {
    const savedLogo = JSON.parse(localStorage.getItem("organizationLogo") || "null");
    return savedLogo?.type === "image" ? savedLogo.value : null;
  } catch {
    return null;
  }
}

export default function ContractorNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const organizationLogo = getOrganizationLogo();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("IsLogin");
    localStorage.removeItem("User_id");
    localStorage.removeItem("name");
    localStorage.removeItem("organizationId");
    localStorage.removeItem("role");
    navigate("/home");
  };

  const menuItems = [
    { label: t("navbar.add_project"), path: "/contractor/add-project", icon: AddCircleOutlineIcon },
    { label: t("navbar.all_projects"), path: "/contractor/project", icon: FolderOpenOutlinedIcon },
    { label: t("navbar.workers"), path: "/contractor/workers", icon: GroupsOutlinedIcon },
    { label: t("navbar.add_worker"), path: "/contractor/add-worker", icon: PersonAddAltOutlinedIcon },
  ];

  return (
    <>
      {/* TOP BAR */}
      <AppBar position="static" className="contractor-appbar" sx={{ backgroundColor: "var(--palette-background-paper)", color: "var(--color-organization-profile-nav-text)" }}>
        <Toolbar className="contractor-toolbar" sx={{ justifyContent: 'space-between' }}>
          {/* Mobile Menu Icon */}
          <IconButton
            edge="start"
            color="inherit"
            sx={{ display: { md: "none" } }}
            onClick={() => setOpenDrawer(true)}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo */}
          <Box className="contractor-wordmark" sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", flexGrow: 1 }} onClick={() => navigate("/contractor/home")}>
            ODRA<span>OPS</span>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>



            {/* Desktop Menu */}
            <Box className="contractor-desktop-menu" sx={{ display: { xs: "none", md: "flex" }, gap: 3 }}>
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
              to="/contractor/organization-profile"
              aria-label="Edit organization profile"
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
                "&:hover": { bgcolor: "var(--color-organization-profile-nav-avatar-hover)" },
                "&:focus-visible": { outline: "var(--control-focus-outline-width) solid var(--palette-primary-main)", outlineOffset: "var(--control-focus-outline-offset)" },
              }}
            >
              {organizationLogo ? <img src={organizationLogo} alt="" /> : getOwnerInitials()}
            </Avatar>

            {/* Logout Button */}
            <Button
              variant="contained"
              onClick={logout}
              sx={{
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

      {/* MOBILE DRAWER */}
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
                  navigate("/contractor/home");
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
                to="/contractor/organization-profile"
                onClick={() => {
                  setOpenDrawer(false);
                }}
                aria-label="Edit organization profile"
                sx={{ bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", border: 0, cursor: "pointer" }}
              >
                {organizationLogo ? <img src={organizationLogo} alt="" /> : getOwnerInitials()}
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
    </>
  );
}
