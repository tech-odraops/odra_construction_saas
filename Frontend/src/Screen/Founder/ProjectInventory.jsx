import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "../../utils/axiosInstance";
import InventoryHistory from "./InventoryHistory";
import Footer from "../../Components/Footer";
import { useTranslation } from "react-i18next";
import {
  Typography,
  Paper
} from "@mui/material";
import { toast } from "react-toastify";
import InventoryBreakdownModal from "../../Components/InventoryBreakdownModal";
import InventoryWorkflowPanel from "./InventoryWorkflowPanel";
import Button from "../../Components/atoms/Button/Button";
import Input from "../../Components/atoms/Input/Input";
import { createAuthenticatedSocket } from "../../utils/socket";

export default function ProjectInventory() {
  const { id: projectId } = useParams();
  const { t } = useTranslation();
  const inventoryWorkflowApi = useMemo(() => ({
    listLocations: () => axios.get("/inventory/locations"),
    getLocationInventory: (locationId) =>
      axios.get(`/inventory/locations/${locationId}/inventory`),
    listMaterials: (includeInactive) =>
      axios.get(`/inventory/materials${includeInactive ? "?includeInactive=true" : ""}`),
    listVendors: (includeInactive) =>
      axios.get(`/inventory/vendors${includeInactive ? "?includeInactive=true" : ""}`),
    listIndents: (locationId) =>
      axios.get(`/inventory/indents?locationId=${encodeURIComponent(locationId)}`),
    listTransfers: (locationId) =>
      axios.get(`/inventory/transfers?locationId=${encodeURIComponent(locationId)}`),
    listPurchaseOrders: (locationId) =>
      axios.get(`/inventory/purchase-orders?locationId=${encodeURIComponent(locationId)}`),
    listGoodsReceipts: (locationId) =>
      axios.get(`/inventory/goods-receipts?locationId=${encodeURIComponent(locationId)}`),
    createMaterial: (payload) => axios.post("/inventory/materials", payload),
    updateMaterial: (materialId, payload) =>
      axios.patch(`/inventory/materials/${materialId}`, payload),
    createVendor: (payload) => axios.post("/inventory/vendors", payload),
    updateVendor: (vendorId, payload) =>
      axios.patch(`/inventory/vendors/${vendorId}`, payload),
    createWarehouse: (payload) => axios.post("/inventory/locations", payload),
    createIndent: (payload) => axios.post("/inventory/indents", payload),
    fulfillIndent: (indentId, payload) =>
      axios.patch(`/inventory/indents/${indentId}/fulfillment`, payload),
    cancelIndent: (indentId) => axios.patch(`/inventory/indents/${indentId}/cancel`),
    updateTransfer: (transferId, action) =>
      axios.patch(`/inventory/transfers/${transferId}/${action}`),
    dispatchTransfer: (transferId) =>
      axios.post(`/inventory/transfers/${transferId}/dispatch`, {}),
    receiveTransfer: (transferId, payload) =>
      axios.post(`/inventory/transfers/${transferId}/receive`, payload),
    cancelPurchaseOrder: (purchaseOrderId) =>
      axios.patch(`/inventory/purchase-orders/${purchaseOrderId}/cancel`),
    createGoodsReceipt: (payload) => axios.post("/inventory/goods-receipts", payload)
  }), []);
  const [items, setItems] = useState([]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState({
    totalPurchasedValue: 0,
    totalUsedCost: 0,
    remainingStockValue: 0
  });

  const fetchInventory = useCallback(async () => {
    const res = await axios.get(`/inventory/${projectId}`);
    setItems(res.data.items);
  }, [projectId]);

  // Refresh summary after any inventory change
  const refreshSummary = useCallback(async () => {
    try {
      const res = await axios.get(`/inventory/summary/${projectId}`);
      setSummary({
        totalPurchasedValue: res.data.totalPurchasedValue || 0,
        totalUsedCost: res.data.totalUsedCost || 0,
        remainingStockValue: res.data.remainingStockValue || 0
      });
    } catch (err) {
      console.error("Failed to refresh summary", err);
    }
  }, [projectId]);

  // socket connection
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    if (!socket) return undefined;

    socket.emit("join", { projectId });

    const handleInventoryUpdated = (data) => {
      setItems((prev) =>
        prev.map((item) =>
          item._id === data.inventoryItemId
            ? { ...item, availableQuantity: data.availableQuantity, isLowStock: data.isLowStock }
            : item
        )
      );

      refreshSummary();

    };

    const handleInventoryItemAdded = () => {
      fetchInventory();
      refreshSummary();
    };
    socket.on("inventory:updated", handleInventoryUpdated);
    socket.on("inventory:item-added", handleInventoryItemAdded);

    return () => {
      socket.off("inventory:updated", handleInventoryUpdated);
      socket.off("inventory:item-added", handleInventoryItemAdded);
      socket.disconnect();
    };
  }, [projectId, fetchInventory, refreshSummary]);


  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);
  const addItem = async () => {
    try {
      await axios.post(`/inventory/${projectId}`, {
        name,
        unit,
        supplierName,
        companyName,
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
        purchaseDate
      });

      toast.success("Material added");
      await Promise.all([fetchInventory(), refreshSummary()]);
      setName("");
      setUnit("");
      setQuantity("");
      setPricePerUnit("");
      // fetchInventory();
      // refreshSummary();
      setSupplierName("");
      setCompanyName("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);

    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  return (
    <>
      <main className="project-inventory-page">
        <div className="project-inventory-main">
          <header className="project-inventory-heading">
            <Typography component="h1" className="project-inventory-title">{t("inventory.project_inventory")}</Typography>
            <Typography>{t("inventory.manage_inventory")}</Typography>
          </header>
          <section className="inventory-summary-grid">
            {[
              { title: t("inventory.total_purchased_value"), value: summary.totalPurchasedValue, icon: "🛒" },
              { title: t("inventory.total_used_cost"), value: summary.totalUsedCost, icon: "⬡" },
              { title: t("inventory.remaining_stock_value"), value: summary.remainingStockValue, icon: "▱" },
            ].map(({ title, value, icon }) => (
              <Paper className="inventory-summary-card" elevation={0} key={title}>
                <span className="inventory-summary-icon">{icon}</span>
                <span className="inventory-summary-copy"><Typography>{title}</Typography><Typography className="inventory-summary-value">₹ {Number(value || 0).toLocaleString("en-IN")}</Typography></span>
              </Paper>
            ))}
          </section>
          <Button className="inventory-breakdown-button" variant="outlined" disabled={!items.length} onClick={() => setBreakdownOpen(true)}>{t("inventory.view_cost_breakdown")}</Button>
          <section className="project-inventory-grid">
            <Paper className="inventory-form-card" elevation={0}>
              <Typography component="h2" className="inventory-section-title">{t("inventory.add_material")}</Typography>
              <div className="inventory-material-form">
                {[
                  { label: t("inventory.material_name"), value: name, change: setName, icon: "⬡" },
                  { label: t("inventory.unit"), value: unit, change: setUnit, icon: "▱" },
                  { label: "Supplier Name", value: supplierName, change: setSupplierName, icon: "♙" },
                  { label: "Company Name", value: companyName, change: setCompanyName, icon: "▥" },
                  { label: t("inventory.quantity"), value: quantity, change: setQuantity, icon: "▤", type: "number" },
                  { label: t("inventory.price_per_unit"), value: pricePerUnit, change: setPricePerUnit, icon: "₹", type: "number" },
                  { label: "Purchase Date", value: purchaseDate, change: setPurchaseDate, icon: "▣", type: "date" },
                ].map(({ label, value, change, icon, type }) => (
                  <div className="inventory-input-row" key={label}><span className="inventory-input-icon">{icon}</span><Input label={label} type={type || "text"} value={value} onChange={(e) => change(e.target.value)} min={type === "number" ? 0 : undefined} /></div>
                ))}
                <Button className="inventory-submit-button" fullWidth variant="contained" onClick={addItem}>{t("inventory.add_material")}</Button>
              </div>
            </Paper>
            <Paper className="inventory-list-card" elevation={0}>
              <div className="inventory-list-heading"><Typography component="h2" className="inventory-section-title">{t("inventory.current_inventory")}</Typography><Button className="inventory-history-button" component={Link} to={`/founder/projects/${projectId}/inventory-history`}>{t("inventory.view_history")}</Button></div>
              {!items.length && <Typography color="text.secondary">{t("inventory.no_materials")}</Typography>}
              <div className="inventory-items">{items.map((item) => <div className="inventory-item-row" key={item._id}><span className="inventory-item-icon">⬡</span><div className="inventory-item-name"><Typography>{item.name}</Typography><Typography>{item.unit}</Typography></div><div className="inventory-item-quantity"><Typography>{item.availableQuantity} / {item.totalQuantity}</Typography>{item.isLowStock && <Typography className="inventory-low-stock">⚠ {t("inventory.low_stock")}</Typography>}</div></div>)}</div>
            </Paper>
          </section>
        </div>
      </main>
      <InventoryWorkflowPanel projectId={projectId} api={inventoryWorkflowApi} />
      <InventoryBreakdownModal
        open={breakdownOpen}
        handleClose={() => setBreakdownOpen(false)}
        items={items}
      />

    </>
  );
}
