import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import axios from "../../utils/axiosInstance";
import InventoryStockUpdate from "./InventoryStockUpdate";
import InventorySelectorModal from "./InventorySelectorModal";

const sampleLocation = {
  _id: "sample-location",
  name: "Project Inventory",
  type: "project_site"
};

const sampleInventory = [
  {
    _id: "sample-sand",
    name: "Sand",
    category: "Bali",
    materialId: "100201",
    unit: "set",
    stockUnit: "doz",
    availableQuantity: 321,
    totalQuantity: 321
  },
  {
    _id: "sample-brick",
    name: "Brick",
    category: "Etaa",
    materialId: "173839",
    unit: "set",
    stockUnit: "doz",
    availableQuantity: 1000,
    totalQuantity: 1000
  }
];

const sampleTransfers = [];
const surfaceSx = {
  bgcolor: "var(--color-dashboard-surface)",
  border: "1px solid var(--color-dashboard-border)",
  borderRadius: "var(--dashboard-container-radius)",
  boxShadow: "none"
};

const getId = (value) => (value && typeof value === "object" ? value._id : value);
const isApiUnavailable = (error) =>
  !error.response || error.response.status === 404 || error.response.status === 501;

const displayQuantity = (quantity) =>
  Number(quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function InventoryList({
  locations,
  selectedLocationId,
  onLocationChange,
  locationsLoading
}) {
  const [tab, setTab] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [inventorySelectorOpen, setInventorySelectorOpen] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState("Team Member");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryMembers, setInventoryMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberLoadError, setMemberLoadError] = useState("");
  const [memberInventoryMessage, setMemberInventoryMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sampleInventoryMode, setSampleInventoryMode] = useState(false);
  const [sampleTransferMode, setSampleTransferMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState(null);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const availableLocations = locations.length ? locations : [sampleLocation];
  const selectedLocation = availableLocations.find(
    (location) => String(location._id) === String(selectedLocationId)
  ) || availableLocations[0];
  const isSampleLocation = selectedLocation?._id === sampleLocation._id;
  const projectId = getId(selectedLocation?.projectId);

  useEffect(() => {
    if (!inventorySelectorOpen) return undefined;
    if (!projectId || isSampleLocation) {
      setInventoryMembers([]);
      setMembersLoading(false);
      setMemberLoadError("");
      return undefined;
    }
    let active = true;
    setMembersLoading(true);
    setInventoryMembers([]);
    setMemberLoadError("");
    axios.get(`/projects/${projectId}`)
      .then((response) => {
        if (active) setInventoryMembers(response.data.project?.siteEngineers || []);
      })
      .catch((error) => {
        if (active) {
          setMemberLoadError(
            error.response?.data?.message || error.message || "Project members could not be loaded."
          );
        }
      })
      .finally(() => {
        if (active) setMembersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [inventorySelectorOpen, isSampleLocation, projectId]);

  useEffect(() => {
    if (!selectedLocationId && locations.length) {
      onLocationChange(locations[0]._id);
    }
  }, [locations, onLocationChange, selectedLocationId]);

  useEffect(() => {
    if (locationsLoading) return undefined;
    if (isSampleLocation || !selectedLocation?._id) {
      setInventory(sampleInventory);
      setTransfers(sampleTransfers);
      setSampleInventoryMode(true);
      setSampleTransferMode(true);
      setErrorMessage("");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setErrorMessage("");
    Promise.all([
      axios.get(`/inventory/locations/${selectedLocation._id}/inventory`),
      axios.get(`/inventory/transfers?locationId=${encodeURIComponent(selectedLocation._id)}`)
    ]).then(([inventoryResponse, transferResponse]) => {
      if (!active) return;
      setInventory(inventoryResponse.data.items || []);
      setTransfers(transferResponse.data.transfers || []);
      setSampleInventoryMode(false);
      setSampleTransferMode(false);
    }).catch((error) => {
      if (!active) return;
      if (isApiUnavailable(error)) {
        setInventory(sampleInventory);
        setTransfers(sampleTransfers);
        setSampleInventoryMode(true);
        setSampleTransferMode(true);
      } else {
        setErrorMessage(error.response?.data?.message || error.message || "Inventory could not be loaded.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [locationsLoading, selectedLocation?._id, isSampleLocation]);

  const visibleInventory = useMemo(() => inventory.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      item.name,
      item.unit,
      item.category,
      item.materialId?._id,
      item.materialId,
      item._id
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const isLowStock = item.isLowStock
      ?? Number(item.availableQuantity || 0) <= Number(item.totalQuantity || 0) * 0.2;
    return matchesSearch && (filter === "all" || (filter === "low" && isLowStock));
  }), [filter, inventory, search]);

  const visibleTransfers = useMemo(() => transfers.filter((transfer) => {
    const isRequest = transfer.status === "requested";
    const matchesTab = tab === 1 ? !isRequest : isRequest;
    const query = search.trim().toLowerCase();
    const materialNames = (transfer.items || []).map((item) => item.materialName).join(" ");
    const matchesSearch = !query || [
      materialNames,
      transfer.status,
      transfer.sourceLocationId?.name,
      transfer.destinationLocationId?.name,
      transfer._id
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesFilter = filter === "all" || transfer.status === filter;
    return matchesTab && matchesSearch && matchesFilter;
  }), [filter, search, tab, transfers]);

  const openMaterialDialog = (item = null) => {
    setErrorMessage("");
    setDialogOpen(true);
    setDialogItem(item);
    setForm({
      name: item?.name || "",
      unit: item?.unit || "",
      quantity: "",
      pricePerUnit: item?.pricePerUnit ?? "",
      supplierName: item?.supplierName || "",
      companyName: item?.companyName || "",
      purchaseDate: new Date().toISOString().slice(0, 10)
    });
  };

  const closeMaterialDialog = () => {
    setDialogOpen(false);
    setDialogItem(null);
    setForm({});
  };

  const addSampleStock = (quantity) => {
    setInventory((current) => {
      const existing = current.find((item) =>
        item.name.toLowerCase() === form.name.trim().toLowerCase()
        && item.unit.toLowerCase() === form.unit.trim().toLowerCase()
      );
      if (existing) {
        return current.map((item) => item === existing
          ? {
            ...item,
            availableQuantity: Number(item.availableQuantity || 0) + quantity,
            totalQuantity: Number(item.totalQuantity || 0) + quantity
          }
          : item);
      }
      return [...current, {
        _id: `sample-${Date.now()}`,
        name: form.name.trim(),
        unit: form.unit.trim(),
        supplierName: form.supplierName.trim(),
        companyName: form.companyName.trim(),
        availableQuantity: quantity,
        totalQuantity: quantity,
        pricePerUnit: Number(form.pricePerUnit)
      }];
    });
  };

  const submitMaterial = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.unit.trim() || !form.supplierName.trim()
      || !form.companyName.trim() || Number(form.quantity) <= 0
      || Number(form.pricePerUnit) < 0 || !form.purchaseDate) {
      setErrorMessage("Enter the material, unit, supplier, company, quantity, price, and purchase date.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    const quantity = Number(form.quantity);
    if (sampleInventoryMode) {
      addSampleStock(quantity);
      closeMaterialDialog();
      setSaving(false);
      return;
    }

    if (!projectId) {
      setErrorMessage("Stock can only be updated for a project-site inventory.");
      setSaving(false);
      return;
    }

    try {
      await axios.post(`/inventory/${projectId}`, {
        name: form.name.trim(),
        unit: form.unit.trim(),
        quantity,
        pricePerUnit: Number(form.pricePerUnit),
        supplierName: form.supplierName.trim(),
        companyName: form.companyName.trim(),
        purchaseDate: form.purchaseDate
      });
      const response = await axios.get(
        `/inventory/locations/${selectedLocation._id}/inventory`
      );
      setInventory(response.data.items || []);
      closeMaterialDialog();
    } catch (error) {
      if (isApiUnavailable(error)) {
        setSampleInventoryMode(true);
        addSampleStock(quantity);
        closeMaterialDialog();
      } else {
        setErrorMessage(error.response?.data?.message || error.message || "Material could not be saved.");
      }
    } finally {
      setSaving(false);
    }
  };

  const tabLabels = ["Material List", "Transfer Order", "Transfer Requests"];
  const filters = tab === 0
    ? [["all", "All materials"], ["low", "Low stock"]]
    : [["all", "All statuses"], ...Array.from(new Set(transfers.map((entry) => entry.status)))
      .map((status) => [status, status.replaceAll("_", " ")])];

  if (updatingItem) {
    return (
      <InventoryStockUpdate
        item={updatingItem}
        isSample={sampleInventoryMode}
        projectId={projectId}
        onBack={() => setUpdatingItem(null)}
        onSaved={async (updatedItem) => {
          if (sampleInventoryMode) {
            setInventory((current) => current.map((item) =>
              item._id === updatedItem._id ? updatedItem : item
            ));
          } else {
            const response = await axios.get(
              `/inventory/locations/${selectedLocation._id}/inventory`
            );
            setInventory(response.data.items || []);
          }
          setUpdatingItem(null);
        }}
      />
    );
  }

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, value) => {
          setTab(value);
          setFilter("all");
        }}
        aria-label="Inventory sections"
        sx={{
          minHeight: 44,
          borderBottom: "1px solid var(--color-dashboard-border)",
          mb: 1.25,
          "& .MuiTab-root": {
            minHeight: 44,
            minWidth: 72,
            px: 2,
            textTransform: "none",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-dashboard-muted-text)"
          },
          "& .Mui-selected": { color: "var(--palette-primary-main) !important" },
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: "var(--dashboard-button-radius) var(--dashboard-button-radius) 0 0",
            bgcolor: "var(--palette-primary-main)"
          }
        }}
      >
        {tabLabels.map((label) => <Tab key={label} label={label} />)}
      </Tabs>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1.25 }}>
        <TextField
          size="small"
          placeholder={tab === 0 ? "Search materials..." : "Search transfers..."}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: "1 1 320px", "& .MuiOutlinedInput-root": { bgcolor: "var(--color-dashboard-surface)" } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          }}
        />
        <IconButton
          aria-label="Filter inventory"
          onClick={(event) => setFilterAnchor(event.currentTarget)}
          sx={{ border: "1px solid var(--color-dashboard-border)", borderRadius: "var(--input-border-radius)", width: 44, height: 40 }}
        >
          <FilterListIcon />
        </IconButton>
        {tab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openMaterialDialog()}
            sx={{
              bgcolor: "var(--palette-primary-main)",
              borderRadius: "var(--dashboard-button-radius)",
              fontWeight: "var(--font-weight-bold)",
              px: 2.5,
              height: 40,
              "&:hover": { bgcolor: "var(--palette-primary-dark)" }
            }}
          >
            Add Material
          </Button>
        )}
      </Box>

      <Button
        onClick={() => {
          setInventorySearch("");
          setMemberInventoryMessage("");
          setInventorySelectorOpen(true);
        }}
        endIcon={<KeyboardArrowDownIcon />}
        disabled={locationsLoading}
        sx={{
          mb: 1.25,
          px: 0,
          textTransform: "none",
          color: "var(--color-organization-profile-text)",
          fontWeight: "var(--font-weight-regular)"
        }}
      >
        In: <Box component="span" sx={{ ml: 0.5, fontWeight: "var(--font-weight-bold)" }}>
          Project Inventory
        </Box>
      </Button>

      {(sampleInventoryMode || sampleTransferMode) && (
        <Alert severity="info" sx={{ mb: 1.25 }}>
          Showing sample inventory because the inventory API is unavailable.
        </Alert>
      )}
      {errorMessage && <Alert severity="error" sx={{ mb: 1.25 }}>{errorMessage}</Alert>}

      {tab === 0 ? (
        <Box sx={{ display: "grid", gap: 1 }}>
          {loading && <Typography color="text.secondary">Loading inventory...</Typography>}
          {!loading && visibleInventory.length === 0 && (
            <Paper sx={{ ...surfaceSx, p: 3, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>
              No materials found for this location.
            </Paper>
          )}
          {visibleInventory.map((item) => {
            const materialId = getId(item.materialId);
            const itemCode = item.materialId?.code || String(materialId || item._id).slice(-6).toUpperCase();
            return (
              <Paper
                key={item._id}
                sx={{
                  ...surfaceSx,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr auto", sm: "minmax(190px, 1fr) minmax(140px, 1fr) minmax(170px, 1fr) auto" },
                  alignItems: "center",
                  gap: { xs: 1, sm: 2 },
                  px: { xs: 1.25, sm: 1.75 },
                  py: 1.25
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "var(--input-border-radius)",
                    bgcolor: "var(--color-organization-profile-avatar-surface)",
                    color: "var(--palette-primary-main)"
                  }}>
                    <Inventory2OutlinedIcon />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-organization-profile-text)" }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.materialId?.category || item.category || selectedLocation?.name}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ borderLeft: { sm: "1px solid var(--color-dashboard-border)" }, pl: { sm: 2.5 } }}>
                  <Typography color="text.secondary">Item code: {itemCode}</Typography>
                  <Typography color="text.secondary">UOM: {item.unit || "-"}</Typography>
                </Box>
                <Typography sx={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-organization-profile-text)" }}>
                  In stock: {displayQuantity(item.availableQuantity)} {item.stockUnit || item.unit || ""}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setUpdatingItem(item)}
                  disabled={!sampleInventoryMode && !projectId}
                  sx={{
                    justifySelf: "end",
                    borderColor: "var(--color-dashboard-border)",
                    color: "var(--palette-primary-main)",
                    textTransform: "none",
                    whiteSpace: "nowrap"
                  }}
                >
                  Update
                </Button>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 1 }}>
          {loading && <Typography color="text.secondary">Loading transfers...</Typography>}
          {!loading && visibleTransfers.length === 0 && (
            <Paper sx={{ ...surfaceSx, p: 3, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>
              No {tab === 1 ? "transfer orders" : "transfer requests"} found.
            </Paper>
          )}
          {visibleTransfers.map((transfer) => (
            <Paper
              key={transfer._id}
              sx={{ ...surfaceSx, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1fr 1fr auto" }, alignItems: "center", gap: 1.5, px: 1.75, py: 1.5 }}
            >
              <Box>
                <Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>
                  {(transfer.items || []).map((item) => item.materialName).join(", ") || "Material transfer"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {String(transfer._id).slice(-6).toUpperCase()}
                </Typography>
              </Box>
              <Typography color="text.secondary">From: {transfer.sourceLocationId?.name || "-"}</Typography>
              <Typography color="text.secondary">To: {transfer.destinationLocationId?.name || "-"}</Typography>
              <Typography sx={{ textTransform: "capitalize", fontWeight: "var(--font-weight-semibold)" }}>
                {String(transfer.status || "").replaceAll("_", " ")}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
        {filters.map(([value, label]) => (
          <MenuItem
            key={value}
            selected={filter === value}
            onClick={() => {
              setFilter(value);
              setFilterAnchor(null);
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>

      <InventorySelectorModal
        open={inventorySelectorOpen}
        onClose={() => setInventorySelectorOpen(false)}
        projectName={selectedLocation?.name || "Project"}
        locations={availableLocations}
        selectedLocationId={selectedLocation?._id}
        onSelectLocation={(locationId) => {
          onLocationChange(locationId);
          setInventorySelectorOpen(false);
        }}
        inventoryCategory={inventoryCategory}
        onCategoryChange={(category) => {
          setInventoryCategory(category);
          setMemberInventoryMessage("");
        }}
        search={inventorySearch}
        onSearchChange={setInventorySearch}
        members={inventoryMembers}
        membersLoading={membersLoading}
        memberLoadError={memberLoadError}
        memberInventoryMessage={memberInventoryMessage}
        onSelectProjectInventory={() => setInventorySelectorOpen(false)}
        onSelectMember={(member) => {
          const memberName = typeof member === "string" ? member : member.name;
          setMemberInventoryMessage(
            `${memberName || "This team member"} does not have a separate inventory endpoint yet.`
          );
        }}
      />

      <Dialog open={dialogOpen} onClose={closeMaterialDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitMaterial}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {dialogItem ? "Update stock" : "Add material"}
            <IconButton aria-label="Close dialog" onClick={closeMaterialDialog}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
            <TextField required label="Material name" value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <TextField required label="Unit" value={form.unit || ""} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
            <TextField required label="Quantity to add" type="number" inputProps={{ min: 0.01, step: "any" }} value={form.quantity || ""} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
            <TextField required label="Price per unit" type="number" inputProps={{ min: 0, step: "any" }} value={form.pricePerUnit ?? ""} onChange={(event) => setForm((current) => ({ ...current, pricePerUnit: event.target.value }))} />
            <TextField required label="Supplier" value={form.supplierName || ""} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} />
            <TextField required label="Company" value={form.companyName || ""} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
            <TextField required label="Purchase date" type="date" InputLabelProps={{ shrink: true }} value={form.purchaseDate || ""} onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeMaterialDialog} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : dialogItem ? "Update stock" : "Add material"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
