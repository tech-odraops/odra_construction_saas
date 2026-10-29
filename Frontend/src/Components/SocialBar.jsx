import React from 'react'
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { Box, Typography, Divider } from "@mui/material";
import Button from "./atoms/Button/Button";

export default function SocialBar({colourStyle}) {
    return (
        <Box
            sx={{
                display: "flex",
                gap: 2,
                mt: 2,
                justifyContent: { xs: "center", md: "flex-start" },
            }}
        >
            <Button
                iconOnly
                component="a"
                href="https://instagram.com"
                target="_blank"
                sx={{
                    color: "white",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": {
                        color: "#E1306C", // insta color
                        borderColor: "#E1306C",
                        backgroundColor: "rgba(225,48,108,0.08)",
                    },
                }}
            >
                <InstagramIcon sx={{...colourStyle}}/>
            </Button>

            <Button
                iconOnly
                component="a"
                href="https://wa.me/916370627088"
                target="_blank"
                sx={{
                    color: "white",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": {
                        color: "#25D366", // whatsapp
                        borderColor: "#25D366",
                        backgroundColor: "rgba(37,211,102,0.08)",
                    },
                }}
            >
                <WhatsAppIcon sx={{...colourStyle}}/>
            </Button>
        </Box>
    )
}
