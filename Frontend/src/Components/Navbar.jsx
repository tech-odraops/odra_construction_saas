import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import axiosInstance from "../utils/axiosInstance";
import { useTheme } from "@emotion/react";
import { Divider } from "@mui/material"
import SocialBar from "./SocialBar"

import {
  Select,
  MenuItem,
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
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";

export default function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme()

  const [login, setLogin] = React.useState(false);
  const [openDrawer, setOpenDrawer] = React.useState(false);

  React.useEffect(() => {
    const checkValidity = async () => {

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axiosInstance.get("/token/me");

        if (response.status === 200) {
          // console.log(response.data)
          if (response.data.role != "admin") {
            setLogin(true);
          }

          const backendRole = response.data.role;

          if (backendRole === "manager") {
            navigate("/contractor/home");
          } else if (backendRole === "site engineer") {
            navigate("/engineer/home");
          } else {
            navigate("/");
          }
        }

      } catch (err) {
        console.log(err);
        setLogin(false);
        localStorage.removeItem("token");
        localStorage.removeItem("IsLogin");
        localStorage.removeItem("User_id");
      }
    };

    checkValidity();
  }, [navigate]);

  const menuItems = [
    { label: t("navbar.home"), path: "/home" },
  ];

  return (
    <>
      {/* TOP BAR */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: "#fff", color: "#17191c", borderBottom: "1px solid #f0f0f0" }}>
        <Toolbar sx={{ position: "relative", justifyContent: 'space-between', minHeight: { xs: 58, md: 46 }, px: { xs: 1.5, md: 1.25 } }}>
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
          <Box onClick={() => navigate("/home")} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", cursor: "pointer", fontFamily: '"IBM Plex Sans", Arial, sans-serif', fontSize: 20, lineHeight: 1, fontWeight: 800, letterSpacing: "-.045em" }} aria-label="ODRAOPS home">
            <span>ODRA</span><span style={{ color: "#F97316" }}>OPS</span>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", ml: "auto" }}>
            {/* Desktop Menu */}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 4, mr: 3, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              {menuItems.map((item) => (
                <Typography
                  key={item.label}
                  component={Link}
                  to={item.path}
                  sx={{
                    color: "#202124",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 12,
                    "&:hover": {
                      color: "#F97316",
                    }
                  }}
                >
                  {item.label}
                </Typography>
              ))}
            </Box>

            {/* CTA Buttons */}
            {!login && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  component={Link}
                  to="/Login"
                  variant="contained"
                  sx={{
                    color: "white",
                    backgroundColor: "#F97316",
                    boxShadow: "none",
                    borderRadius: "3px",
                    px: 1.7,
                    py: 0.15,
                    minWidth: 70,
                    fontSize: 12,
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "#e9540c",
                    },
                  }}
                >
                  {t("navbar.login")}
                </Button>

              </Box>
            )}

            <Select
              size="small"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              sx={{
                ml: 2,
                backgroundColor: "#fff",
                borderRadius: 1,
                height: 35,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#F97316" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#F97316" },
              }}
              MenuProps={{
                sx: {
                  "& .MuiMenuItem-root:hover": {
                    color: "#F97316 !important",
                    backgroundColor: "rgba(249, 115, 22, 0.08) !important",
                  },
                  "& .MuiMenuItem-root.Mui-selected": {
                    color: "#F97316 !important",
                    backgroundColor: "rgba(249, 115, 22, 0.12) !important",
                  },
                  "& .MuiMenuItem-root.Mui-selected:hover": {
                    backgroundColor: "rgba(249, 115, 22, 0.16) !important",
                  },
                }
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
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Box onClick={() => { navigate("/home"); setOpenDrawer(false); }} sx={{ cursor: "pointer", fontFamily: '"IBM Plex Sans", Arial, sans-serif', fontSize: 21, fontWeight: 800, letterSpacing: "-.045em" }}>
                <span>ODRA</span><span style={{ color: "#F97316" }}>OPS</span>
              </Box>
            </Box>

            {/* DIVIDER */}
            <Divider sx={{ mb: 2, backgroundColor: "text.primary" }} />

            {/* MENU ITEMS */}
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
                    "&:hover": {
                      backgroundColor: "rgba(249, 115, 22, 0.08)",
                      "& .MuiListItemText-root": {
                        color: "#F97316"
                      }
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    sx={{ color: "text.primary" }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* BOTTOM SECTION */}
          <Box>
            {/* CTA BUTTONS */}
            {!login && (
              <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mb: 2 }}>
                <Button

                  component={Link}
                  to="/Login"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    borderColor: "#F97316",
                    color: "#F97316",
                    "&:hover": {
                      borderColor: "#e9540c",
                      backgroundColor: "rgba(249, 115, 22, 0.08)",
                    }
                  }}
                >
                  {t("navbar.login")}
                </Button>

              </Box>
            )}

            {/* SOCIAL BAR */}
            <Divider sx={{ mb: 1, backgroundColor: "text.primary" }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 2,
              }}
            >
              <SocialBar colourStyle={{ "color": "black" }} />
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
