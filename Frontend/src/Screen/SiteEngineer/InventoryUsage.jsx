import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../utils/axiosInstance";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import SiteEngineerNavbar from "../../Components/SiteEngineerNavbar";
import Footer from "../../Components/Footer";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem
} from "@mui/material";
import Button from "../../Components/atoms/Button/Button";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

export default function InventoryUsage() {
  const { id: projectId } = useParams();
  const { t } = useTranslation();

  const token = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const currentUserId = decoded.User_id;

  const [items, setItems] = useState([]);
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [usedQty, setUsedQty] = useState("");
  const today = new Date().toISOString().split("T")[0];

  /* ---------------------------
     Fetch inventory
  --------------------------- */
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await axios.get(`/inventory/${projectId}`);
        setItems(res.data.items || []);
      } catch (err) {
        toast.error("Failed to load inventory");
      }
    };

    fetchInventory();
  }, [projectId]);

  /* ---------------------------
     Socket logic 
  --------------------------- */
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    });

    socket.emit("join", { projectId });

    // When stock is consumed
    socket.on("inventory:updated", (data) => {

      // Prevent double update for sender
      if (data.updatedBy === currentUserId) return;

      setItems(prev =>
        prev.map(item =>
          item._id === data.inventoryItemId
            ? {
                ...item,
                availableQuantity: data.availableQuantity,
                isLowStock: data.isLowStock
              }
            : item
        )
      );
    });

    // 🔵 When material added or refilled
    socket.on("inventory:item-added", (data) => {

      setItems(prev => {
        const exists = prev.find(i => i._id === data.item._id);

        const lowStockThreshold =
          data.item.totalQuantity * 0.2;

        const updatedItem = {
          ...data.item,
          isLowStock:
            data.item.availableQuantity <= lowStockThreshold
        };

        if (exists) {
          return prev.map(i =>
            i._id === data.item._id ? updatedItem : i
          );
        }

        return [...prev, updatedItem];
      });
      
    });

    socket.on("project:deleted", (data) => {
      toast.info("Project has been deleted");
      navigate(`/site-engineer/projects`);
    })

    return () => socket.disconnect();

  }, [projectId, currentUserId]);

  /* ---------------------------
     Submit usage (FIXED)
  --------------------------- */
  const submitUsage = async () => {
    if (!inventoryItemId || !usedQty) {
      toast.error("Please select material and quantity");
      return;
    }

    try {
      await axios.post("/inventory/usage", {
        projectId,
        inventoryItemId,
        usedQty: Number(usedQty),
        date: today
      });

      // 🔥 Optimistic update with LOW STOCK recalculation
      setItems(prev =>
        prev.map(item => {
          if (item._id === inventoryItemId) {

            const newAvailable =
              item.availableQuantity - Number(usedQty);

            const lowStockThreshold =
              item.totalQuantity * 0.2;

            const isLowStock =
              newAvailable <= lowStockThreshold;

            return {
              ...item,
              availableQuantity: newAvailable,
              isLowStock
            };
          }

          return item;
        })
      );

      toast.success("Usage recorded");
      setUsedQty("");

    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed"
      );
    }
  };

  /* ---------------------------
     DO NOT TOUCH UI BELOW
  --------------------------- */

  return (
    <>
      <SiteEngineerNavbar />
  
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
          py: { xs: 3, md: 5 },
        }}
      >
        <Box className="container">
  
          {/* HEADER */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h1" gutterBottom sx={{ fontWeight: 800, lineHeight: 1.05 }}>
              Inventory <Box component="span" sx={{ color: '#F97316' }}>Usage</Box>
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 720, mx: 'auto' }}>
              {t("inventory.inventory_usage_desc")}
            </Typography>
          </Box>
  
          {/* MAIN CARD */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: "18px",
              boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
              maxWidth: 700,
              mx: "auto",
            }}
          >
            {/* MATERIAL SELECT */}
            <TextField
              select
              label={t("inventory.select_material")}
              fullWidth
              sx={{ mb: 3 }}
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
            >
              {items.length === 0 && (
                <MenuItem disabled>{t("inventory.no_materials_available")}</MenuItem>
              )}
  
              {items.map((item) => (
                <MenuItem key={item._id} value={item._id}>
                  {item.name} — {item.availableQuantity} {item.unit}
                  {item.isLowStock && `⚠ ${t("inventory.low_stock")}`}
                </MenuItem>
              ))}
            </TextField>
  
            {/* QUANTITY */}
            <TextField
              label={t("inventory.used_quantity_label")}
              type="number"
              fullWidth
              sx={{ mb: 3 }}
              value={usedQty}
              onChange={(e) => setUsedQty(e.target.value)}
              inputProps={{ min: 1 }}
            />
  
            {/* DATE */}
            <TextField
              label={t("inventory.date")}
              type="date"
              fullWidth
              sx={{ mb: 4 }}
              value={today}
              InputProps={{ readOnly: true }}
            />
  
            {/* ACTION BUTTON */}
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#F97316",
                color: "#fff",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "#E65E0C",
                },
              }}
              onClick={submitUsage}
            >
              {t("inventory.submit_usage")}
            </Button>
          </Paper>
  
          
        </Box>
      </Box>
  
      <Footer />
    </>
  );
  
}
