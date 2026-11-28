import React, { useState } from "react";
import {
  Alert,
  Box,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import Button from "../../Components/atoms/Button/Button";
import axios from "../../utils/axiosInstance";

const surfaceSx = {
  bgcolor: "var(--color-dashboard-surface)",
  border: "1px solid var(--color-dashboard-border)",
  borderRadius: "var(--dashboard-container-radius)",
  boxShadow: "none"
};

const getId = (value) => (value && typeof value === "object" ? value._id : value);
const displayQuantity = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function InventoryStockUpdate({
  item,
  isSample,
  projectId,
  onBack,
  onSaved
}) {
  const [mode, setMode] = useState("used");
  const [quantity, setQuantity] = useState("");
  const [comment, setComment] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [supplierName, setSupplierName] = useState(item.supplierName || "");
  const [companyName, setCompanyName] = useState(item.companyName || "");
  const [pricePerUnit, setPricePerUnit] = useState(item.pricePerUnit ?? "");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const amount = Number(quantity) || 0;
  const currentStock = Number(item.availableQuantity || 0);
  const updatedStock = currentStock + (mode === "used" ? -amount : amount);
  const materialId = getId(item.materialId);
  const itemCode = item.materialId?.code || String(materialId || item._id).slice(-6).toUpperCase();
  const needsSupplierDetails = !supplierName || !companyName;

  const submit = async (event) => {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Enter a quantity greater than zero.");
      return;
    }
    if (mode === "used" && amount > currentStock) {
      setErrorMessage("Used quantity cannot exceed the available stock.");
      return;
    }
    if (mode === "add" && (
      !supplierName.trim()
      || !companyName.trim()
      || pricePerUnit === ""
      || !Number.isFinite(Number(pricePerUnit))
      || Number(pricePerUnit) < 0
      || !purchaseDate
    )) {
      setErrorMessage("Enter the supplier, company, unit price, and purchase date to add stock.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      if (isSample) {
        await onSaved({
          ...item,
          availableQuantity: updatedStock,
          totalQuantity: mode === "add"
            ? Number(item.totalQuantity || 0) + amount
            : Number(item.totalQuantity || 0)
        });
        return;
      }

      if (!projectId) {
        setErrorMessage("This inventory location is not linked to a project.");
        return;
      }

      if (mode === "used") {
        await axios.post("/inventory/usage", {
          projectId,
          inventoryItemId: item._id,
          usedQty: amount,
          date: new Date().toISOString().slice(0, 10),
          comment: comment.trim()
        });
      } else {
        await axios.post(`/inventory/${projectId}`, {
          name: item.name,
          unit: item.unit,
          quantity: amount,
          pricePerUnit: Number(pricePerUnit),
          supplierName: supplierName.trim(),
          companyName: companyName.trim(),
          purchaseDate,
          comment: comment.trim()
        });
      }
      await onSaved();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || "Stock could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Paper
        component="button"
        type="button"
        onClick={onBack}
        sx={{
          ...surfaceSx,
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.25,
          mb: 1.5,
          textAlign: "left",
          cursor: "pointer",
          color: "var(--color-organization-profile-text)"
        }}
      >
        <ArrowBackIcon fontSize="small" />
        <Typography component="span" sx={{ fontWeight: "var(--font-weight-bold)" }}>
          Update Stock
        </Typography>
      </Paper>
      <Paper component="form" onSubmit={submit} sx={{ ...surfaceSx, overflow: "hidden" }}>
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(190px, 1fr) minmax(140px, 1fr) auto" },
          alignItems: "center",
          gap: 2,
          px: { xs: 1.5, sm: 2.5 },
          py: 2,
          borderBottom: "1px solid var(--color-dashboard-border)"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{
              width: 56,
              height: 56,
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--input-border-radius)",
              bgcolor: "var(--color-organization-profile-avatar-surface)",
              color: "var(--palette-primary-main)"
            }}>
              <Inventory2OutlinedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-organization-profile-text)" }}>
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.materialId?.category || item.category || ""}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ borderLeft: { sm: "1px solid var(--color-dashboard-border)" }, pl: { sm: 2.5 } }}>
            <Typography color="text.secondary">Item code: {itemCode}</Typography>
            <Typography color="text.secondary">UOM: {item.unit || "-"}</Typography>
          </Box>
          <Typography sx={{
            justifySelf: { sm: "end" },
            border: "1px solid var(--color-dashboard-border)",
            borderRadius: "var(--input-border-radius)",
            px: 1.5,
            py: 0.5,
            color: "var(--palette-primary-main)",
            fontWeight: "var(--font-weight-bold)"
          }}>
            In stock: {displayQuantity(currentStock)} {item.stockUnit || item.unit || ""}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <RadioGroup
            row
            value={mode}
            onChange={(event) => {
              setMode(event.target.value);
              setErrorMessage("");
            }}
            sx={{ gap: { xs: 1, sm: 4 }, mb: 2 }}
          >
            <Box component="label" sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <Radio value="used" sx={{ color: "var(--color-dashboard-muted-text)", "&.Mui-checked": { color: "var(--palette-primary-main)" } }} />
              <Typography sx={{ fontWeight: "var(--font-weight-semibold)" }}>Used from stock</Typography>
            </Box>
            <Box component="label" sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <Radio value="add" sx={{ color: "var(--color-dashboard-muted-text)", "&.Mui-checked": { color: "var(--palette-primary-main)" } }} />
              <Typography sx={{ fontWeight: "var(--font-weight-semibold)" }}>Add to Stock</Typography>
            </Box>
          </RadioGroup>

          {mode === "add" && needsSupplierDetails && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5, mb: 2 }}>
              <TextField required size="small" label="Supplier" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
              <TextField required size="small" label="Company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              <TextField required size="small" label="Purchase date" type="date" InputLabelProps={{ shrink: true }} value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
            </Box>
          )}

          <TextField
            fullWidth
            size="small"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputProps={{
              min: 0.01,
              max: mode === "used" ? currentStock : undefined,
              step: "any",
              "aria-label": "Quantity to update"
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {mode === "used"
                    ? <RemoveCircleOutlineIcon color="primary" />
                    : <AddCircleOutlineIcon color="primary" />}
                </InputAdornment>
              ),
              endAdornment: <InputAdornment position="end">{item.unit || ""}</InputAdornment>
            }}
          />
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Updated in stock: {displayQuantity(Math.max(0, updatedStock))} {item.stockUnit || item.unit || ""}
          </Typography>

          {mode === "add" && (
            <Box sx={{ mt: 1.5 }}>
              <Typography component="label" htmlFor="inventory-unit-price" variant="body2" sx={{ display: "block", mb: 0.75, fontWeight: "var(--font-weight-semibold)" }}>
                Unit Price
              </Typography>
              <TextField
                id="inventory-unit-price"
                required
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 0, step: "any" }}
                value={pricePerUnit}
                onChange={(event) => setPricePerUnit(event.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/ {item.unit || "unit"}</InputAdornment>
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                This helps keep the inventory worth accurate
              </Typography>
            </Box>
          )}

          {commentOpen ? (
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Comment"
              value={comment}
              inputProps={{ maxLength: 1000 }}
              onChange={(event) => setComment(event.target.value)}
              sx={{ mt: 1.5 }}
            />
          ) : (
            <Button
              startIcon={<AddIcon />}
              onClick={() => setCommentOpen(true)}
              sx={{ mt: 1.5, px: 0, textTransform: "none", color: "var(--palette-primary-main)", fontWeight: "var(--font-weight-bold)" }}
            >
              Add comment
            </Button>
          )}
          {errorMessage && <Alert severity="error" sx={{ mt: 1.5 }}>{errorMessage}</Alert>}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={onBack} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Updating..." : "Update Stock"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
