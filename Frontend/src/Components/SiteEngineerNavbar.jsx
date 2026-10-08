import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import Divider from "@mui/material/Divider";
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
  MenuItem,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";

export default function SiteEngineerNavbar() {
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const { t } = useTranslation();

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
    { label: t("navbar.home"), path: "/engineer/home" },
    { label: t("navbar.all_projects"), path: "/site-engineer/projects" },
  ];

  return (
    <>
      <AppBar
        position="static"
        className="contractor-appbar"
        sx={{ backgroundColor: "#fff", color: "#202326" }}
      >
        <Toolbar className="contractor-toolbar" sx={{ justifyContent: "space-between" }}>
          <IconButton
            edge="start"
            color="inherit"
            sx={{ display: { md: "none" } }}
            onClick={() => setOpenDrawer(true)}
          >
            <MenuIcon />
          </IconButton>

          <Box
            className="contractor-wordmark"
            sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", flexGrow: 1 }}
            onClick={() => navigate("/engineer/home")}
          >
            ODRA<span>OPS</span>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Box className="contractor-desktop-menu" sx={{ display: { xs: "none", md: "flex" }, gap: 3 }}>
              {menuItems.map((item) => (
                <Typography
                  key={item.label}
                  component={Link}
                  to={item.path}
                  sx={{
                    color: "#26323d",
                    textDecoration: "none",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {item.label}
                </Typography>
              ))}
            </Box>

            <Avatar
              sx={{
                bgcolor: "#F97316",
                ml: 2.5,
                mr: 1.5,
                width: 28,
                height: 28,
                fontSize: 13,
              }}
            >
              {localStorage.getItem("name")?.charAt(0)}
            </Avatar>

            <Button
              variant="contained"
              onClick={logout}
              sx={{
                backgroundColor: "#F97316",
                color: "#fff",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "#e9650e",
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
                    "& .MuiMenuItem-root:hover": { backgroundColor: "rgba(249, 115, 22, .12)" },
                    "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(249, 115, 22, .16)", color: "#F97316" },
                    "& .MuiMenuItem-root.Mui-selected:hover": { backgroundColor: "rgba(249, 115, 22, .2)" },
                  },
                },
              }}
              sx={{
                ml: 1.5,
                backgroundColor: "#fff",
                borderRadius: 1,
                height: 32,
              }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="hi">हिं</MenuItem>
              <MenuItem value="or">ଓଡ଼ିଆ</MenuItem>
            </Select>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={openDrawer} onClose={() => setOpenDrawer(false)}>
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
          <Box>
            <Box sx={{ textAlign: "start", mb: 2 }}>
              <div
                className="contractor-wordmark drawer-wordmark"
                onClick={() => {
                  navigate("/engineer/home");
                  setOpenDrawer(false);
                }}
              >
                ODRA<span>OPS</span>
              </div>
            </Box>

            <Divider sx={{ mb: 2, bgcolor: "divider" }} />

            <List>
              {menuItems.map((item) => (
                <ListItem
                  key={item.label}
                  component={Link}
                  to={item.path}
                  onClick={() => setOpenDrawer(false)}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(249, 115, 22, 0.08)",
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "text.primary",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Avatar sx={{ bgcolor: "#F97316" }}>
                {localStorage.getItem("name")?.charAt(0)}
              </Avatar>

              <Button
                variant="contained"
                onClick={logout}
                sx={{
                  flex: 1,
                  fontWeight: 600,
                  backgroundColor: "#F97316",
                  "&:hover": {
                    backgroundColor: "#e9650e",
                  },
                }}
              >
                {t("navbar.logout")}
              </Button>
            </Box>

            <Divider sx={{ mb: 1, bgcolor: "divider" }} />

            <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 2 }}>
              <SocialBar colourStyle={{ color: "#000" }} />
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
