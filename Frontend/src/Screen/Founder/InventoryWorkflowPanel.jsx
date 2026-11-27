import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectRole, selectUserId } from "../../redux/slices/authSlice";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { toast } from "react-toastify";

const sectionSx = {
  border: "1px solid var(--color-dashboard-border)",
  borderRadius: "var(--dashboard-container-radius)",
  boxShadow: "none",
  bgcolor: "var(--color-dashboard-surface)"
};

const emptyLine = () => ({ materialId: "", quantity: "" });
const getId = (value) => (value && typeof value === "object" ? value._id : value);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");
const formatMoney = (value) => `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const statusColor = (status) => {
  if (["fulfilled", "received", "approved"].includes(status)) return "success";
  if (["partially_fulfilled", "partially_received", "in_transit", "sourcing"].includes(status)) return "warning";
  if (["rejected", "cancelled"].includes(status)) return "error";
  return "default";
};

const pendingIndentItems = (indent) => (indent?.items || [])
  .map((item) => ({
    ...item,
    remainingQuantity: item.requestedQuantity - item.fulfilledQuantity - item.allocatedQuantity
  }))
  .filter((item) => item.remainingQuantity > 0);

const pendingReceiptItems = (purchaseOrder) => (purchaseOrder?.items || [])
  .map((item) => ({
    ...item,
    remainingQuantity: item.orderedQuantity - item.receivedQuantity
  }))
  .filter((item) => item.remainingQuantity > 0);

export default function InventoryWorkflowPanel({ projectId, api }) {
  const isFounder = useSelector(selectRole) === "Founder";
  const currentUserId = useSelector(selectUserId);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [locations, setLocations] = useState([]);
  const [siteLocation, setSiteLocation] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [indents, setIndents] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [locationStock, setLocationStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const [dialog, setDialog] = useState("");
  const [activeIndent, setActiveIndent] = useState(null);
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [activePurchaseOrder, setActivePurchaseOrder] = useState(null);
  const [returnToIndent, setReturnToIndent] = useState(false);
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [indentForm, setIndentForm] = useState({
    requiredDate: "",
    notes: "",
    items: [emptyLine()]
  });
  const [materialForm, setMaterialForm] = useState({ name: "", category: "", unit: "" });
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    taxId: "",
    address: ""
  });
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "", address: "" });
  const [fulfillmentForm, setFulfillmentForm] = useState({
    sourceLocationId: "",
    vendorId: "",
    deliveryDate: "",
    shippingCost: "0",
    notes: "",
    items: []
  });
  const [transferReceiptForm, setTransferReceiptForm] = useState({ notes: "", items: [] });
  const [goodsReceiptForm, setGoodsReceiptForm] = useState({
    receivedDate: new Date().toISOString().slice(0, 10),
    notes: "",
    items: []
  });

  const warehouses = useMemo(
    () => locations.filter((location) => location.type === "warehouse" && location.isActive),
    [locations]
  );
  const selectedLocation = useMemo(
    () => locations.find((location) => String(location._id) === String(selectedLocationId)),
    [locations, selectedLocationId]
  );
  const accessibleLocationIds = useMemo(
    () => new Set(locations.map((location) => String(location._id))),
    [locations]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const locationResponse = await api.listLocations();
      const accessibleLocations = locationResponse.data.locations || [];
      const projectSite = accessibleLocations.find((location) =>
        location.type === "project_site" && String(getId(location.projectId)) === String(projectId)
      );
      if (!projectSite) {
        throw new Error("The project inventory location is not available to your account.");
      }

      setLocations(accessibleLocations);
      setSiteLocation(projectSite);
      setSelectedLocationId((current) =>
        current && accessibleLocations.some((location) => String(location._id) === String(current))
          ? current
          : projectSite._id
      );

      const [
        materialResponse,
        vendorResponse,
        indentResponse,
        transferResponse,
        orderResponse,
        receiptResponse
      ] = await Promise.all([
        api.listMaterials(showInactive),
        api.listVendors(showInactive),
        api.listIndents(projectSite._id),
        api.listTransfers(projectSite._id),
        api.listPurchaseOrders(projectSite._id),
        api.listGoodsReceipts(projectSite._id)
      ]);
      setMaterials(materialResponse.data.materials || []);
      setVendors(vendorResponse.data.vendors || []);
      setIndents(indentResponse.data.indents || []);
      setTransfers(transferResponse.data.transfers || []);
      setPurchaseOrders(orderResponse.data.purchaseOrders || []);
      setGoodsReceipts(receiptResponse.data.receipts || []);
    } catch (error) {
      console.error("Failed to load inventory workflow", error);
      setLoadError(error.response?.data?.message || error.message || "Failed to load inventory workflow.");
    } finally {
      setLoading(false);
    }
  }, [api, projectId, showInactive]);

  const refreshLocationStock = useCallback(async () => {
    if (!selectedLocationId) return;
    setStockLoading(true);
    setStockError("");
    try {
      const response = await api.getLocationInventory(selectedLocationId);
      setLocationStock(response.data);
    } catch (error) {
      console.error("Failed to load location inventory", error);
      setStockError(error.response?.data?.message || "Failed to load this location's inventory.");
      setLocationStock(null);
    } finally {
      setStockLoading(false);
    }
  }, [api, selectedLocationId]);

  useEffect(() => {
    setSelectedLocationId("");
    setLocationStock(null);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    refreshLocationStock();
  }, [refreshLocationStock, stockRefreshKey]);

  const runMutation = async (request, successMessage) => {
    try {
      await request();
      toast.success(successMessage);
      await load();
      setStockRefreshKey((key) => key + 1);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Inventory update failed.");
      return false;
    }
  };

  const closeDialog = () => {
    setDialog("");
    setActiveIndent(null);
    setActiveTransfer(null);
    setActivePurchaseOrder(null);
    setReturnToIndent(false);
  };

  const openNewIndent = () => {
    setIndentForm({ requiredDate: "", notes: "", items: [emptyLine()] });
    setReturnToIndent(false);
    setDialog("newIndent");
  };

  const openIndentFulfillment = (method, indent) => {
    setActiveIndent(indent);
    setFulfillmentForm({
      sourceLocationId: warehouses[0]?._id || "",
      vendorId: vendors.find((vendor) => vendor.isActive)?._id || "",
      deliveryDate: "",
      shippingCost: "0",
      notes: "",
      items: pendingIndentItems(indent).map((item) => ({
        materialId: getId(item.materialId),
        orderedQuantity: String(item.remainingQuantity),
        unitPrice: "",
        taxRate: "0",
        materialName: item.materialName,
        unit: item.unit
      }))
    });
    setDialog(method === "transfer" ? "indentTransfer" : "indentPurchase");
  };

  const openTransferReceipt = (transfer) => {
    setActiveTransfer(transfer);
    setTransferReceiptForm({
      notes: "",
      items: transfer.items
        .map((item) => ({
          materialId: getId(item.materialId),
          quantity: String(item.dispatchedQuantity - item.receivedQuantity),
          materialName: item.materialName,
          unit: item.unit,
          remainingQuantity: item.dispatchedQuantity - item.receivedQuantity
        }))
        .filter((item) => item.remainingQuantity > 0)
    });
    setDialog("transferReceipt");
  };

  const openGoodsReceipt = (purchaseOrder) => {
    setActivePurchaseOrder(purchaseOrder);
    setGoodsReceiptForm({
      receivedDate: new Date().toISOString().slice(0, 10),
      notes: "",
      items: pendingReceiptItems(purchaseOrder).map((item) => ({
        materialId: getId(item.materialId),
        receivedQuantity: String(item.remainingQuantity),
        materialName: item.materialName,
        unit: item.unit,
        remainingQuantity: item.remainingQuantity
      }))
    });
    setDialog("goodsReceipt");
  };

  const submitIndent = async () => {
    if (!siteLocation || indentForm.items.some((item) =>
      !item.materialId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0
    )) {
      toast.error("Choose a material and enter a positive quantity for every line.");
      return;
    }
    const saved = await runMutation(
      () => api.createIndent({
        locationId: siteLocation._id,
        requiredDate: indentForm.requiredDate || undefined,
        notes: indentForm.notes,
        items: indentForm.items.map((item) => ({
          materialId: item.materialId,
          quantity: Number(item.quantity)
        }))
      }),
      "Indent created"
    );
    if (saved) closeDialog();
  };

  const submitIndentFulfillment = async () => {
    if (!activeIndent) return;
    if (dialog === "indentTransfer") {
      if (!fulfillmentForm.sourceLocationId) {
        toast.error("Select a source location.");
        return;
      }
      const saved = await runMutation(
        () => api.fulfillIndent(activeIndent._id, {
          method: "transfer",
          sourceLocationId: fulfillmentForm.sourceLocationId,
          notes: fulfillmentForm.notes
        }),
        "Transfer request created"
      );
      if (saved) closeDialog();
      return;
    }

    if (
      !fulfillmentForm.vendorId ||
      fulfillmentForm.items.length === 0 ||
      fulfillmentForm.items.some((item) =>
        !Number.isFinite(Number(item.orderedQuantity)) ||
        Number(item.orderedQuantity) <= 0 ||
        Number(item.orderedQuantity) > item.remainingQuantity ||
        item.unitPrice === "" ||
        !Number.isFinite(Number(item.unitPrice)) ||
        Number(item.unitPrice) < 0 ||
        !Number.isFinite(Number(item.taxRate || 0)) ||
        Number(item.taxRate) < 0 ||
        Number(item.taxRate) > 100
      ) ||
      !Number.isFinite(Number(fulfillmentForm.shippingCost)) ||
      Number(fulfillmentForm.shippingCost) < 0
    ) {
      toast.error("Select a vendor and enter valid quantity, unit price, and tax for each line.");
      return;
    }
    const saved = await runMutation(
      () => api.fulfillIndent(activeIndent._id, {
        method: "purchase",
        vendorId: fulfillmentForm.vendorId,
        deliveryDate: fulfillmentForm.deliveryDate || undefined,
        shippingCost: Number(fulfillmentForm.shippingCost || 0),
        notes: fulfillmentForm.notes,
        items: fulfillmentForm.items.map((item) => ({
          materialId: item.materialId,
          orderedQuantity: Number(item.orderedQuantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0)
        }))
      }),
      "Purchase order created"
    );
    if (saved) closeDialog();
  };

  const submitGoodsReceipt = async () => {
    if (!activePurchaseOrder || goodsReceiptForm.items.length === 0 ||
      goodsReceiptForm.items.some((item) =>
        !Number.isFinite(Number(item.receivedQuantity)) ||
        Number(item.receivedQuantity) <= 0 ||
        Number(item.receivedQuantity) > item.remainingQuantity
      )) {
      toast.error("Enter a positive received quantity within the remaining order amount.");
      return;
    }
    const saved = await runMutation(
      () => api.createGoodsReceipt({
        purchaseOrderId: activePurchaseOrder._id,
        receivedDate: goodsReceiptForm.receivedDate,
        notes: goodsReceiptForm.notes,
        items: goodsReceiptForm.items.map((item) => ({
          materialId: item.materialId,
          receivedQuantity: Number(item.receivedQuantity)
        }))
      }),
      "Goods receipt recorded"
    );
    if (saved) closeDialog();
  };

  const submitTransferReceipt = async () => {
    if (!activeTransfer || transferReceiptForm.items.length === 0 ||
      transferReceiptForm.items.some((item) =>
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        Number(item.quantity) > item.remainingQuantity
      )) {
      toast.error("Enter a positive received quantity within the dispatched amount.");
      return;
    }
    const saved = await runMutation(
      () => api.receiveTransfer(activeTransfer._id, {
        notes: transferReceiptForm.notes,
        items: transferReceiptForm.items.map((item) => ({
          materialId: item.materialId,
          quantity: Number(item.quantity)
        }))
      }),
      "Transfer receipt recorded"
    );
    if (saved) closeDialog();
  };

  const submitCatalogEntry = async () => {
    let request;
    let message;
    if (dialog === "newMaterial") {
      if (!materialForm.name.trim() || !materialForm.category.trim() || !materialForm.unit.trim()) {
        toast.error("Enter material name, category, and unit.");
        return;
      }
      request = () => api.createMaterial({
        name: materialForm.name,
        category: materialForm.category,
        unit: materialForm.unit
      });
      message = "Material added to catalog";
    } else if (dialog === "newVendor") {
      if (!vendorForm.name.trim()) {
        toast.error("Vendor name is required.");
        return;
      }
      request = () => api.createVendor(vendorForm);
      message = "Vendor added";
    } else {
      if (!warehouseForm.name.trim()) {
        toast.error("Warehouse name is required.");
        return;
      }
      request = () => api.createWarehouse(warehouseForm);
      message = "Warehouse created";
    }

    if (dialog === "newMaterial" && returnToIndent) {
      try {
        const response = await request();
        await load();
        const createdMaterial = response.data.material;
        if (createdMaterial?._id) {
          setIndentForm((form) => {
            const emptyIndex = form.items.findIndex((item) => !item.materialId);
            if (emptyIndex === -1) return form;
            return {
              ...form,
              items: form.items.map((item, index) =>
                index === emptyIndex ? { ...item, materialId: createdMaterial._id } : item
              )
            };
          });
        }
        toast.success(message);
        setReturnToIndent(false);
        setDialog("newIndent");
      } catch (error) {
        toast.error(error.response?.data?.message || error.message || "Inventory update failed.");
      }
      return;
    }

    const saved = await runMutation(request, message);
    if (saved) closeDialog();
  };

  const setIndentLine = (index, key, value) => {
    setIndentForm((form) => ({
      ...form,
      items: form.items.map((item, lineIndex) =>
        lineIndex === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const setFulfillmentLine = (index, key, value) => {
    setFulfillmentForm((form) => ({
      ...form,
      items: form.items.map((item, lineIndex) =>
        lineIndex === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const renderEmptyRow = (message, columnCount) => (
    <TableRow>
      <TableCell colSpan={columnCount}>
        <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>{message}</Typography>
      </TableCell>
    </TableRow>
  );

  const renderDialog = () => {
    const titles = {
      newIndent: "Create material indent",
      indentTransfer: "Fulfill from another location",
      indentPurchase: "Create purchase order",
      newMaterial: "Add catalog material",
      newVendor: "Add vendor",
      newWarehouse: "Create warehouse",
      transferReceipt: "Receive transferred stock",
      goodsReceipt: "Record goods receipt"
    };

    return (
      <Dialog open={Boolean(dialog)} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{titles[dialog]}</DialogTitle>
        <DialogContent dividers>
          {dialog === "newIndent" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {!materials.some((material) => material.isActive) && (
                <Alert
                  severity="info"
                  action={<Button color="inherit" size="small" onClick={() => {
                    setMaterialForm({ name: "", category: "", unit: "" });
                    setReturnToIndent(true);
                    setDialog("newMaterial");
                  }}>Add material</Button>}
                >
                  Add an active catalog material before adding it to this indent.
                </Alert>
              )}
              {indentForm.items.map((item, index) => (
                <Box key={`indent-line-${index}`} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr auto", sm: "minmax(0, 2fr) minmax(120px, 1fr) auto" }, gap: 1, alignItems: "center" }}>
                  <TextField select label="Material" value={item.materialId} disabled={!materials.some((material) => material.isActive)} onChange={(event) => setIndentLine(index, "materialId", event.target.value)}>
                    {materials.filter((material) => material.isActive !== false).map((material) => (
                      <MenuItem key={material._id} value={material._id}>{material.name} ({material.unit})</MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Quantity" type="number" value={item.quantity} onChange={(event) => setIndentLine(index, "quantity", event.target.value)} inputProps={{ min: 0.01, step: "any" }} />
                  <Button color="error" disabled={indentForm.items.length === 1} onClick={() => setIndentForm((form) => ({ ...form, items: form.items.filter((_, lineIndex) => lineIndex !== index) }))}>Remove</Button>
                </Box>
              ))}
              <Button variant="outlined" onClick={() => setIndentForm((form) => ({ ...form, items: [...form.items, emptyLine()] }))}>Add material line</Button>
              <TextField label="Required date" type="date" value={indentForm.requiredDate} onChange={(event) => setIndentForm((form) => ({ ...form, requiredDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Notes" value={indentForm.notes} onChange={(event) => setIndentForm((form) => ({ ...form, notes: event.target.value }))} multiline minRows={2} />
            </Stack>
          )}

          {dialog === "indentTransfer" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField select label="Source location" value={fulfillmentForm.sourceLocationId} onChange={(event) => setFulfillmentForm((form) => ({ ...form, sourceLocationId: event.target.value }))}>
                {locations.filter((location) => String(location._id) !== String(siteLocation?._id)).map((location) => (
                  <MenuItem key={location._id} value={location._id}>{location.name} ({location.type === "warehouse" ? "Warehouse" : "Project site"})</MenuItem>
                ))}
              </TextField>
              <TextField label="Notes" value={fulfillmentForm.notes} onChange={(event) => setFulfillmentForm((form) => ({ ...form, notes: event.target.value }))} multiline minRows={2} />
              <Typography variant="body2" color="text.secondary">The remaining quantities on this indent will be requested from the selected source.</Typography>
            </Stack>
          )}

          {dialog === "indentPurchase" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField select label="Vendor" value={fulfillmentForm.vendorId} onChange={(event) => setFulfillmentForm((form) => ({ ...form, vendorId: event.target.value }))}>
                {vendors.filter((vendor) => vendor.isActive).map((vendor) => <MenuItem key={vendor._id} value={vendor._id}>{vendor.name}</MenuItem>)}
              </TextField>
              {fulfillmentForm.items.map((item, index) => (
                <Box key={item.materialId} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "minmax(140px, 1.5fr) repeat(3, minmax(100px, 1fr))" }, gap: 1 }}>
                  <TextField label="Material" value={`${item.materialName} (${item.unit})`} disabled />
                  <TextField label="Quantity" type="number" value={item.orderedQuantity} onChange={(event) => setFulfillmentLine(index, "orderedQuantity", event.target.value)} inputProps={{ min: 0.01, max: item.remainingQuantity, step: "any" }} helperText={`Remaining: ${item.remainingQuantity}`} />
                  <TextField label="Unit price" type="number" value={item.unitPrice} onChange={(event) => setFulfillmentLine(index, "unitPrice", event.target.value)} inputProps={{ min: 0, step: "any" }} />
                  <TextField label="Tax %" type="number" value={item.taxRate} onChange={(event) => setFulfillmentLine(index, "taxRate", event.target.value)} inputProps={{ min: 0, max: 100, step: "any" }} />
                </Box>
              ))}
              <TextField label="Expected delivery" type="date" value={fulfillmentForm.deliveryDate} onChange={(event) => setFulfillmentForm((form) => ({ ...form, deliveryDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Shipping cost" type="number" value={fulfillmentForm.shippingCost} onChange={(event) => setFulfillmentForm((form) => ({ ...form, shippingCost: event.target.value }))} inputProps={{ min: 0, step: "any" }} />
              <TextField label="Notes" value={fulfillmentForm.notes} onChange={(event) => setFulfillmentForm((form) => ({ ...form, notes: event.target.value }))} multiline minRows={2} />
            </Stack>
          )}

          {dialog === "transferReceipt" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {transferReceiptForm.items.map((item, index) => (
                <Box key={item.materialId} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "minmax(160px, 2fr) minmax(120px, 1fr)" }, gap: 1 }}>
                  <TextField label="Material" value={`${item.materialName} (${item.unit})`} disabled />
                  <TextField label="Receive quantity" type="number" value={item.quantity} onChange={(event) => setTransferReceiptForm((form) => ({ ...form, items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line) }))} inputProps={{ min: 0.01, max: item.remainingQuantity, step: "any" }} helperText={`Dispatched but not received: ${item.remainingQuantity}`} />
                </Box>
              ))}
              <TextField label="Notes" value={transferReceiptForm.notes} onChange={(event) => setTransferReceiptForm((form) => ({ ...form, notes: event.target.value }))} multiline minRows={2} />
            </Stack>
          )}

          {dialog === "goodsReceipt" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Received date" type="date" value={goodsReceiptForm.receivedDate} onChange={(event) => setGoodsReceiptForm((form) => ({ ...form, receivedDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
              {goodsReceiptForm.items.map((item, index) => (
                <Box key={item.materialId} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "minmax(160px, 2fr) minmax(120px, 1fr)" }, gap: 1 }}>
                  <TextField label="Material" value={`${item.materialName} (${item.unit})`} disabled />
                  <TextField label="Received quantity" type="number" value={item.receivedQuantity} onChange={(event) => setGoodsReceiptForm((form) => ({ ...form, items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, receivedQuantity: event.target.value } : line) }))} inputProps={{ min: 0.01, max: item.remainingQuantity, step: "any" }} helperText={`Open quantity: ${item.remainingQuantity}`} />
                </Box>
              ))}
              <TextField label="Notes" value={goodsReceiptForm.notes} onChange={(event) => setGoodsReceiptForm((form) => ({ ...form, notes: event.target.value }))} multiline minRows={2} />
            </Stack>
          )}

          {dialog === "newMaterial" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField autoFocus required label="Material name" value={materialForm.name} onChange={(event) => setMaterialForm((form) => ({ ...form, name: event.target.value }))} />
              <TextField required label="Category" value={materialForm.category} onChange={(event) => setMaterialForm((form) => ({ ...form, category: event.target.value }))} />
              <TextField required label="Unit of measure" value={materialForm.unit} onChange={(event) => setMaterialForm((form) => ({ ...form, unit: event.target.value }))} />
            </Stack>
          )}

          {dialog === "newVendor" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField autoFocus required label="Vendor name" value={vendorForm.name} onChange={(event) => setVendorForm((form) => ({ ...form, name: event.target.value }))} />
              <TextField label="Contact name" value={vendorForm.contactName} onChange={(event) => setVendorForm((form) => ({ ...form, contactName: event.target.value }))} />
              <TextField label="Email" type="email" value={vendorForm.email} onChange={(event) => setVendorForm((form) => ({ ...form, email: event.target.value }))} />
              <TextField label="Phone" value={vendorForm.phone} onChange={(event) => setVendorForm((form) => ({ ...form, phone: event.target.value }))} />
              <TextField label="Tax ID" value={vendorForm.taxId} onChange={(event) => setVendorForm((form) => ({ ...form, taxId: event.target.value }))} />
              <TextField label="Address" value={vendorForm.address} onChange={(event) => setVendorForm((form) => ({ ...form, address: event.target.value }))} multiline minRows={2} />
            </Stack>
          )}

          {dialog === "newWarehouse" && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField autoFocus required label="Warehouse name" value={warehouseForm.name} onChange={(event) => setWarehouseForm((form) => ({ ...form, name: event.target.value }))} />
              <TextField label="Code" value={warehouseForm.code} onChange={(event) => setWarehouseForm((form) => ({ ...form, code: event.target.value }))} />
              <TextField label="Address" value={warehouseForm.address} onChange={(event) => setWarehouseForm((form) => ({ ...form, address: event.target.value }))} multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          {dialog === "newIndent" && <Button variant="contained" onClick={submitIndent} disabled={!materials.some((material) => material.isActive)}>Create indent</Button>}
          {dialog === "indentTransfer" && <Button variant="contained" onClick={submitIndentFulfillment}>Request transfer</Button>}
          {dialog === "indentPurchase" && <Button variant="contained" onClick={submitIndentFulfillment}>Create purchase order</Button>}
          {dialog === "transferReceipt" && <Button variant="contained" onClick={submitTransferReceipt}>Record receipt</Button>}
          {dialog === "goodsReceipt" && <Button variant="contained" onClick={submitGoodsReceipt}>Record GRN</Button>}
          {["newMaterial", "newVendor", "newWarehouse"].includes(dialog) && <Button variant="contained" onClick={submitCatalogEntry}>Save</Button>}
        </DialogActions>
      </Dialog>
    );
  };

  const handleTransferAction = async (transfer, action, message) => {
    await runMutation(
      () => action === "dispatch"
        ? api.dispatchTransfer(transfer._id)
        : api.updateTransfer(transfer._id, action),
      message
    );
  };

  const renderLocationStock = () => (
    <Stack spacing={2}>
      <TextField
        select
        label="Inventory location"
        value={selectedLocationId}
        onChange={(event) => setSelectedLocationId(event.target.value)}
        sx={{ maxWidth: 420 }}
      >
        {locations.map((location) => (
          <MenuItem key={location._id} value={location._id}>
            {location.name} · {location.type === "warehouse" ? "Warehouse" : "Project site"}
          </MenuItem>
        ))}
      </TextField>
      {stockError && <Alert severity="error">{stockError}</Alert>}
      {stockLoading ? <LinearProgress /> : locationStock && (
        <>
          <Typography variant="subtitle2" color="text.secondary">{selectedLocation?.name}</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Purchased ${formatMoney(locationStock.summary?.totalPurchasedValue)}`} />
            <Chip label={`Used ${formatMoney(locationStock.summary?.totalUsedCost)}`} />
            <Chip color="primary" label={`Remaining ${formatMoney(locationStock.summary?.remainingStockValue)}`} />
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Material</TableCell><TableCell>Category</TableCell><TableCell>Available</TableCell><TableCell>Total</TableCell><TableCell>Unit cost</TableCell><TableCell>Stock value</TableCell></TableRow></TableHead>
              <TableBody>
                {(locationStock.items || []).map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.materialId?.category || "—"}</TableCell>
                    <TableCell>{item.availableQuantity} {item.unit}</TableCell>
                    <TableCell>{item.totalQuantity} {item.unit}</TableCell>
                    <TableCell>{formatMoney(item.pricePerUnit)}</TableCell>
                    <TableCell>{formatMoney(item.remainingStockValue)}</TableCell>
                  </TableRow>
                ))}
                {!locationStock.items?.length && renderEmptyRow("No stock recorded at this location.", 6)}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Stack>
  );

  const renderIndents = () => (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={openNewIndent} disabled={loading}>Create indent</Button>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>Indent</TableCell><TableCell>Requested items</TableCell><TableCell>Requested by</TableCell><TableCell>Required date</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {indents.map((indent) => {
              const remaining = pendingIndentItems(indent);
              const canFulfill = remaining.length > 0 && !["fulfilled", "rejected", "cancelled"].includes(indent.status);
              const canCancel = !["fulfilled", "rejected", "cancelled"].includes(indent.status) &&
                indent.items.every((item) => item.allocatedQuantity === 0 && item.fulfilledQuantity === 0) &&
                (isFounder || String(getId(indent.requestedBy)) === currentUserId);
              return (
                <TableRow key={indent._id}>
                  <TableCell>
                    <Typography fontWeight={600}>{String(indent._id).slice(-7).toUpperCase()}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(indent.createdAt)}</Typography>
                  </TableCell>
                  <TableCell>{indent.items.map((item) => `${item.materialName} · ${item.requestedQuantity} ${item.unit}`).join(", ")}</TableCell>
                  <TableCell>{indent.requestedBy?.name || "—"}</TableCell>
                  <TableCell>{formatDate(indent.requiredDate)}</TableCell>
                  <TableCell><Chip size="small" color={statusColor(indent.status)} label={indent.status.replaceAll("_", " ")} /></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {canFulfill && <Button size="small" onClick={() => openIndentFulfillment("transfer", indent)}>Transfer</Button>}
                      {canFulfill && <Button size="small" onClick={() => openIndentFulfillment("purchase", indent)}>Purchase</Button>}
                      {canCancel && <Button size="small" color="error" onClick={() => runMutation(() => api.cancelIndent(indent._id), "Indent cancelled")}>Cancel</Button>}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {!indents.length && renderEmptyRow("No indents for this project yet.", 6)}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  const renderTransfers = () => (
    <TableContainer>
      <Table size="small">
        <TableHead><TableRow><TableCell>Transfer</TableCell><TableCell>From</TableCell><TableCell>To</TableCell><TableCell>Items</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>
          {transfers.map((transfer) => {
            const sourceId = String(getId(transfer.sourceLocationId));
            const destinationId = String(getId(transfer.destinationLocationId));
            const canUseSource = accessibleLocationIds.has(sourceId);
            const canUseDestination = accessibleLocationIds.has(destinationId);
            return (
              <TableRow key={transfer._id}>
                <TableCell>{String(transfer._id).slice(-7).toUpperCase()}</TableCell>
                <TableCell>{transfer.sourceLocationId?.name || "—"}</TableCell>
                <TableCell>{transfer.destinationLocationId?.name || "—"}</TableCell>
                <TableCell>{transfer.items.map((item) => `${item.materialName} · ${item.receivedQuantity}/${item.requestedQuantity}`).join(", ")}</TableCell>
                <TableCell><Chip size="small" color={statusColor(transfer.status)} label={transfer.status.replaceAll("_", " ")} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {transfer.status === "requested" && canUseSource && <>
                      <Button size="small" onClick={() => handleTransferAction(transfer, "approve", "Transfer approved")}>Approve</Button>
                      <Button size="small" color="error" onClick={() => handleTransferAction(transfer, "reject", "Transfer rejected")}>Reject</Button>
                    </>}
                    {["approved", "in_transit", "partially_received"].includes(transfer.status) && canUseSource &&
                      transfer.items.some((item) => item.dispatchedQuantity < item.requestedQuantity) &&
                      <Button size="small" onClick={() => handleTransferAction(transfer, "dispatch", "Transfer dispatched")}>Dispatch</Button>}
                    {["in_transit", "partially_received"].includes(transfer.status) && canUseDestination &&
                      transfer.items.some((item) => item.receivedQuantity < item.dispatchedQuantity) &&
                      <Button size="small" onClick={() => openTransferReceipt(transfer)}>Receive</Button>}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {!transfers.length && renderEmptyRow("No transfers for this project yet.", 6)}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderPurchaseOrders = () => (
    <TableContainer>
      <Table size="small">
        <TableHead><TableRow><TableCell>PO</TableCell><TableCell>Vendor</TableCell><TableCell>Items</TableCell><TableCell>Delivery date</TableCell><TableCell>Total</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>
          {purchaseOrders.map((order) => (
            <TableRow key={order._id}>
              <TableCell>{String(order._id).slice(-7).toUpperCase()}</TableCell>
              <TableCell>{order.vendorSnapshot?.name || order.vendorId?.name || "—"}</TableCell>
              <TableCell>{order.items.map((item) => `${item.materialName} · ${item.receivedQuantity}/${item.orderedQuantity}`).join(", ")}</TableCell>
              <TableCell>{formatDate(order.deliveryDate)}</TableCell>
              <TableCell>{formatMoney(order.totalAmount)}</TableCell>
              <TableCell><Chip size="small" color={statusColor(order.status)} label={order.status.replaceAll("_", " ")} /></TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {["issued", "partially_received"].includes(order.status) && <Button size="small" onClick={() => openGoodsReceipt(order)}>Receive</Button>}
                  {order.status === "issued" && <Button size="small" color="error" onClick={() => runMutation(() => api.cancelPurchaseOrder(order._id), "Purchase order cancelled")}>Cancel</Button>}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!purchaseOrders.length && renderEmptyRow("No purchase orders for this project yet.", 7)}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGoodsReceipts = () => (
    <TableContainer>
      <Table size="small">
        <TableHead><TableRow><TableCell>GRN</TableCell><TableCell>Received date</TableCell><TableCell>Purchase order</TableCell><TableCell>Items received</TableCell><TableCell>Notes</TableCell></TableRow></TableHead>
        <TableBody>
          {goodsReceipts.map((receipt) => (
            <TableRow key={receipt._id}>
              <TableCell>{String(receipt._id).slice(-7).toUpperCase()}</TableCell>
              <TableCell>{formatDate(receipt.receivedDate)}</TableCell>
              <TableCell>{receipt.purchaseOrderId?._id ? String(receipt.purchaseOrderId._id).slice(-7).toUpperCase() : "—"}</TableCell>
              <TableCell>{receipt.items.map((item) => `${item.materialName} · ${item.receivedQuantity} ${item.unit}`).join(", ")}</TableCell>
              <TableCell>{receipt.notes || "—"}</TableCell>
            </TableRow>
          ))}
          {!goodsReceipts.length && renderEmptyRow("No goods receipts for this project yet.", 5)}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCatalog = () => (
    <Stack spacing={3}>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1 }}>
          <Typography variant="h6">Materials</Typography>
          <Button size="small" variant="outlined" onClick={() => { setMaterialForm({ name: "", category: "", unit: "" }); setDialog("newMaterial"); }}>Add material</Button>
        </Box>
        <TableContainer><Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Category</TableCell><TableCell>Unit</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material._id}>
                <TableCell>{material.name}</TableCell><TableCell>{material.category}</TableCell><TableCell>{material.unit}</TableCell>
                <TableCell><Chip size="small" label={material.isActive ? "Active" : "Inactive"} color={material.isActive ? "success" : "default"} /></TableCell>
                <TableCell align="right"><Button size="small" onClick={() => runMutation(() => api.updateMaterial(material._id, { isActive: !material.isActive }), material.isActive ? "Material deactivated" : "Material activated")}>{material.isActive ? "Deactivate" : "Activate"}</Button></TableCell>
              </TableRow>
            ))}
            {!materials.length && renderEmptyRow("No materials in the catalog.", 5)}
          </TableBody>
        </Table></TableContainer>
      </Box>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1 }}>
          <Typography variant="h6">Vendors</Typography>
          <Button size="small" variant="outlined" onClick={() => { setVendorForm({ name: "", contactName: "", email: "", phone: "", taxId: "", address: "" }); setDialog("newVendor"); }}>Add vendor</Button>
        </Box>
        <TableContainer><Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Contact</TableCell><TableCell>Email / Phone</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor._id}>
                <TableCell>{vendor.name}</TableCell><TableCell>{vendor.contactName || "—"}</TableCell><TableCell>{[vendor.email, vendor.phone].filter(Boolean).join(" / ") || "—"}</TableCell>
                <TableCell><Chip size="small" label={vendor.isActive ? "Active" : "Inactive"} color={vendor.isActive ? "success" : "default"} /></TableCell>
                <TableCell align="right"><Button size="small" onClick={() => runMutation(() => api.updateVendor(vendor._id, { isActive: !vendor.isActive }), vendor.isActive ? "Vendor deactivated" : "Vendor activated")}>{vendor.isActive ? "Deactivate" : "Activate"}</Button></TableCell>
              </TableRow>
            ))}
            {!vendors.length && renderEmptyRow("No vendors in the catalog.", 5)}
          </TableBody>
        </Table></TableContainer>
      </Box>
      {isFounder && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h6">Warehouses</Typography>
            <Button size="small" variant="outlined" onClick={() => { setWarehouseForm({ name: "", code: "", address: "" }); setDialog("newWarehouse"); }}>Add warehouse</Button>
          </Box>
          <TableContainer><Table size="small">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Address</TableCell><TableCell>Type</TableCell></TableRow></TableHead>
            <TableBody>
              {warehouses.map((location) => (
                <TableRow key={location._id}>
                  <TableCell>{location.name}</TableCell><TableCell>{location.code || "—"}</TableCell><TableCell>{location.address || "—"}</TableCell><TableCell>Warehouse</TableCell>
                </TableRow>
              ))}
              {!warehouses.length && renderEmptyRow("No warehouses created.", 4)}
            </TableBody>
          </Table></TableContainer>
        </Box>
      )}
    </Stack>
  );

  return (
    <Paper sx={{ ...sectionSx, mt: 3, p: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 1 }}>
        <Box>
          <Typography component="h2" variant="h6" fontWeight={700}>Inventory workflow</Typography>
          <Typography variant="body2" color="text.secondary">
            {siteLocation?.name || "Loading project location"} · indents, transfers, purchasing, and receipts
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={<Checkbox checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />}
            label="Show inactive catalog entries"
          />
          <Button onClick={() => { load(); setStockRefreshKey((key) => key + 1); }} disabled={loading}>Refresh</Button>
        </Stack>
      </Box>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tab label="Locations & stock" />
        <Tab label={`Indents (${indents.length})`} />
        <Tab label={`Transfers (${transfers.length})`} />
        <Tab label={`Purchase orders (${purchaseOrders.length})`} />
        <Tab label={`Goods receipts (${goodsReceipts.length})`} />
        <Tab label="Catalogs" />
      </Tabs>
      {tab === 0 && renderLocationStock()}
      {tab === 1 && renderIndents()}
      {tab === 2 && renderTransfers()}
      {tab === 3 && renderPurchaseOrders()}
      {tab === 4 && renderGoodsReceipts()}
      {tab === 5 && renderCatalog()}
      {renderDialog()}
    </Paper>
  );
}
