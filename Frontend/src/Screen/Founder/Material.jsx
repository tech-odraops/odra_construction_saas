import React, { useCallback, useEffect } from "react";
import {
  Alert, Avatar, Box, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Tab, Tabs, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Button from "../../Components/atoms/Button/Button";
import { Icon } from "../../Components/atoms/Icon/Icon";
import CreatePurchaseOrder from "./CreatePurchaseOrder";
import IndentActionsModal from "./IndentActionsModal";
import axios from "../../utils/axiosInstance";
import usePopup from "../../contexts/usePopup";

const surfaceSx = { bgcolor: "var(--color-dashboard-surface)", border: "1px solid var(--color-dashboard-border)", borderRadius: "var(--dashboard-container-radius)", boxShadow: "none" };
const getId = (value) => (value && typeof value === "object" ? value._id : value);
const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "-";

const toIndentRow = (indent) => {
  const statusLabels = {
    submitted: "Open",
    sourcing: "Sourcing",
    partially_fulfilled: "Partially Fulfilled",
    fulfilled: "Closed",
    rejected: "Rejected",
    cancelled: "Cancelled"
  };
  const deliveryLabels = {
    submitted: "Not Fulfilled",
    sourcing: "Not Fulfilled",
    partially_fulfilled: "Partially Delivered",
    fulfilled: "Fulfilled",
    rejected: "Rejected",
    cancelled: "Cancelled"
  };
  return {
    ...indent,
    id: `IN-${String(indent._id).slice(-6).toUpperCase()}`,
    createdBy: indent.requestedBy?.name || "You",
    created: formatDate(indent.createdAt),
    expected: formatDate(indent.requiredDate),
    material: indent.items.map((item) => `${item.materialName} · ${item.requestedQuantity} ${item.unit}`).join(", "),
    status: statusLabels[indent.status] || indent.status,
    delivery: deliveryLabels[indent.status] || "Not Fulfilled"
  };
};

export default function Material({ embedded = false, projectId, projectName, socket }) {
  const { showPopup } = usePopup();
  const [area, setArea] = React.useState("Procurement");
  const [tab, setTab] = React.useState(0);
  const [indents, setIndents] = React.useState([]);
  const [locations, setLocations] = React.useState([]);
  const [selectedLocationId, setSelectedLocationId] = React.useState("");
  const [materials, setMaterials] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [addingMaterial, setAddingMaterial] = React.useState(false);
  const [materialForm, setMaterialForm] = React.useState({ name: "", category: "", unit: "" });
  const [form, setForm] = React.useState({ materialId: "", quantity: "", expected: "", notes: "" });
  const [actionsIndent, setActionsIndent] = React.useState(null);
  const [selectedIndent, setSelectedIndent] = React.useState(null);
  const [creatingPO, setCreatingPO] = React.useState(false);
  const [poStep, setPoStep] = React.useState(1);

  const loadCatalogAndLocations = useCallback(async () => {
    setLoading(true);
    try {
      const locationUrl = projectId
        ? `/inventory/locations?projectId=${encodeURIComponent(projectId)}`
        : "/inventory/locations";
      const [locationResponse, materialResponse] = await Promise.all([
        axios.get(locationUrl),
        axios.get("/inventory/materials")
      ]);
      const projectSites = (locationResponse.data.locations || [])
        .filter((location) => location.type === "project_site");
      const projectLocation = projectSites.find((location) =>
        String(getId(location.projectId)) === String(projectId)
      ) || (!projectId ? projectSites[0] : null);

      if (!projectLocation) {
        throw new Error("No accessible project-site inventory location was found.");
      }

      setLocations(projectSites);
      setSelectedLocationId((current) =>
        projectSites.some((location) => String(location._id) === String(current))
          ? current
          : projectLocation._id
      );
      setMaterials(materialResponse.data.materials || []);
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Inventory could not be loaded",
        message: error.response?.data?.message || error.message || "Please try again."
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, showPopup]);

  const loadIndents = useCallback(async (locationId = selectedLocationId) => {
    if (!locationId) {
      setIndents([]);
      return;
    }
    try {
      const response = await axios.get(
        `/inventory/indents?locationId=${encodeURIComponent(locationId)}`
      );
      setIndents((response.data.indents || []).map(toIndentRow));
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Indents could not be loaded",
        message: error.response?.data?.message || error.message || "Please try again."
      });
    }
  }, [selectedLocationId, showPopup]);

  useEffect(() => {
    loadCatalogAndLocations();
  }, [loadCatalogAndLocations]);

  useEffect(() => {
    loadIndents();
  }, [loadIndents]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleIndentUpdated = (event) => {
      if (String(event.locationId) !== String(selectedLocationId)) return;
      if (String(event.actorId) !== String(localStorage.getItem("User_id"))) {
        const messages = {
          created: "A connected team member submitted a new indent.",
          rejected: "A connected team member rejected an indent.",
          cancelled: "A connected team member cancelled an indent.",
          purchase_order_created: "A purchase order was created for an indent.",
          transfer_requested: "A transfer was requested for an indent.",
          transfer_rejected: "A transfer request was rejected.",
          transfer_received: "A transfer was received for an indent.",
          purchase_order_cancelled: "A purchase order for an indent was cancelled.",
          goods_received: "Goods were received for an indent."
        };
        showPopup({
          variant: "success",
          title: "Indent updated",
          message: messages[event.action] || "A connected team member updated an indent."
        });
      }
      loadIndents(selectedLocationId);
    };
    socket.on("inventory:indent-updated", handleIndentUpdated);
    return () => socket.off("inventory:indent-updated", handleIndentUpdated);
  }, [loadIndents, selectedLocationId, showPopup, socket]);

  const createIndent = async () => {
    if (!selectedLocationId || !form.materialId || !Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) {
      showPopup({
        variant: "error",
        title: "Indent details required",
        message: "Choose a project, catalog material, and positive quantity."
      });
      return;
    }

    setSaving(true);
    try {
      await axios.post("/inventory/indents", {
        locationId: selectedLocationId,
        requiredDate: form.expected || undefined,
        notes: form.notes,
        items: [{
          materialId: form.materialId,
          quantity: Number(form.quantity)
        }]
      });
      showPopup({
        variant: "success",
        title: "Indent created",
        message: "The material request was submitted."
      });
      setForm({ materialId: "", quantity: "", expected: "", notes: "" });
      setAddingMaterial(false);
      setDialogOpen(false);
      await loadIndents(selectedLocationId);
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Indent creation failed",
        message: error.response?.data?.message || error.message || "Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  const createCatalogMaterial = async () => {
    if (!materialForm.name.trim() || !materialForm.category.trim() || !materialForm.unit.trim()) {
      showPopup({
        variant: "error",
        title: "Material details required",
        message: "Enter a name, category, and unit."
      });
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post("/inventory/materials", materialForm);
      const material = response.data.material;
      setMaterials((current) => [...current, material]);
      setForm((current) => ({ ...current, materialId: material._id }));
      setAddingMaterial(false);
      showPopup({
        variant: "success",
        title: "Material added",
        message: "The catalog material is ready for this indent."
      });
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Material could not be added",
        message: error.response?.data?.message || error.message || "Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  if (selectedIndent) {
    if (creatingPO) return <CreatePurchaseOrder item={selectedIndent} step={poStep} onStepChange={setPoStep} onBack={() => { if (poStep === 2) setPoStep(1); else { setCreatingPO(false); setPoStep(1); } }} />;
    return <IndentDetail
      item={selectedIndent}
      projectName={projectName}
      onBack={() => setSelectedIndent(null)}
      onCreatePO={() => setCreatingPO(true)}
      onMarkClosed={(id) => { setIndents((items) => items.map((entry) => entry.id === id ? { ...entry, status: "Closed" } : entry)); setSelectedIndent((item) => item ? { ...item, status: "Closed" } : item); }}
      onDelete={(id) => { setIndents((items) => items.filter((entry) => entry.id !== id)); setSelectedIndent(null); }}
      onEdit={(item) => {
        const firstItem = item.items?.[0];
        setForm({
          materialId: getId(firstItem?.materialId) || "",
          quantity: firstItem ? String(firstItem.requestedQuantity) : "",
          expected: item.requiredDate ? new Date(item.requiredDate).toISOString().slice(0, 10) : "",
          notes: item.notes || ""
        });
        setAddingMaterial(false);
        setSelectedIndent(null);
        setDialogOpen(true);
      }}
    />;
  }

  return (
    <Box sx={{ minHeight: embedded ? 0 : "calc(100vh - var(--dashboard-header-height))", p: embedded ? 0 : "var(--dashboard-surface-margin)", bgcolor: embedded ? "transparent" : "var(--color-dashboard-canvas)" }}>
      <Paper sx={{ ...surfaceSx, minHeight: embedded ? 0 : "calc(100vh - var(--dashboard-header-height) - 2 * var(--dashboard-surface-margin))", p: { xs: 1.25, sm: 2 }, boxSizing: "border-box" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 1.25 }}>
          <ToggleButtonGroup exclusive value={area} onChange={(_e, value) => value && setArea(value)} aria-label="Material section" sx={{ p: 0.5, bgcolor: "var(--gray-100)", borderRadius: "var(--input-border-radius)", "& .MuiToggleButton-root": { border: 0, borderRadius: "var(--input-border-radius) !important", px: { xs: 2, sm: 5 }, py: 0.75, color: "var(--color-dashboard-muted-text)", fontWeight: "var(--font-weight-semibold)", textTransform: "none" }, "& .Mui-selected": { bgcolor: "var(--palette-background-paper) !important", color: "var(--color-organization-profile-text) !important", boxShadow: "var(--palette-base-shadow)" } }}>
            <ToggleButton value="Procurement">Procurement</ToggleButton><ToggleButton value="Inventory">Inventory</ToggleButton>
          </ToggleButtonGroup>
          {area === "Procurement" && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} style={{ backgroundColor: "var(--palette-primary-main)", borderColor: "var(--palette-primary-main)", borderRadius: "var(--dashboard-button-radius)", paddingInline: "var(--button-padding-inline)", height: "var(--button-height)", color: "var(--palette-primary-contrast-text)", fontWeight: "var(--font-weight-bold)", opacity: "var(--effect-visible-opacity)", whiteSpace: "nowrap" }}>Create Indent</Button>}
        </Box>

        {!projectId && (
          <TextField
            select
            fullWidth
            label="Project site"
            value={selectedLocationId}
            onChange={(event) => setSelectedLocationId(event.target.value)}
            disabled={loading}
            sx={{ mb: 1.5 }}
          >
            {locations.map((location) => (
              <MenuItem key={location._id} value={location._id}>{location.name}</MenuItem>
            ))}
          </TextField>
        )}

        {area === "Procurement" ? <>
          <Tabs value={tab} onChange={(_e, value) => setTab(value)} aria-label="Procurement sections" sx={{ minHeight: 44, borderBottom: "1px solid var(--color-dashboard-border)", mb: 1.5, "& .MuiTab-root": { minHeight: 44, minWidth: 72, px: 2, textTransform: "none", fontWeight: "var(--font-weight-semibold)", color: "var(--color-dashboard-muted-text)" }, "& .Mui-selected": { color: "var(--palette-primary-main) !important" }, "& .MuiTabs-indicator": { height: 3, borderRadius: "var(--dashboard-button-radius) var(--dashboard-button-radius) 0 0", bgcolor: "var(--palette-primary-main)" } }}>
            <Tab label="Indent" /><Tab label="Deliveries" /><Tab label="Site GRN" />
          </Tabs>
          {tab === 0 ? <Box sx={{ display: "grid", gap: 1 }}>
            {loading && <Typography sx={{ py: 3, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>Loading indents...</Typography>}
            {indents.map((item) => <Paper key={item.id} sx={{ ...surfaceSx, display: "grid", gridTemplateColumns: { xs: "1fr auto", md: "minmax(190px, 1.35fr) repeat(3, minmax(125px, .8fr)) auto" }, alignItems: "center", gap: { xs: 1.25, md: 2 }, px: { xs: 1.25, sm: 1.75 }, py: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                <Avatar variant="rounded" sx={{ width: 40, height: 40, flexShrink: 0, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)" }}><Icon variant="universal-material" size="lg" gradient={null} /></Avatar>
                <Box sx={{ minWidth: 0 }}><Typography component="button" onClick={() => setSelectedIndent(item)} sx={{ p: 0, border: 0, bgcolor: "transparent", cursor: "pointer", textAlign: "left", font: "inherit", fontWeight: "var(--font-weight-bold)", color: "var(--color-organization-profile-text)", "&:hover": { color: "var(--palette-primary-main)" } }}>{item.id}</Typography><Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}><Status label={item.status} /><Status label={item.delivery} /></Box></Box>
              </Box>
              <Info label="Created By" value={item.createdBy} sub={item.created} />
              <Info label="Expected Delivery" value={item.expected} />
              <Info label="Material" value={item.material} />
              <IconButton aria-label={`More actions for ${item.id}`} onClick={() => setActionsIndent(item)} sx={{ justifySelf: "end", border: "1px solid var(--color-dashboard-border)", borderRadius: "var(--input-border-radius)", width: 36, height: 36, color: "var(--color-organization-profile-text)" }}><MoreHorizIcon /></IconButton>
            </Paper>)}
            {!loading && !indents.length && <Typography sx={{ py: 5, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>No indents yet. Create an indent to get started.</Typography>}
          </Box> : <Paper sx={{ ...surfaceSx, p: 4, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>{tab === 1 ? "Delivery records will appear here." : "Site goods receipt notes will appear here."}</Paper>}
        </> : <Paper sx={{ ...surfaceSx, p: 4, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>Inventory for your projects will appear here.</Paper>}
      </Paper>
      <IndentActionsModal
        open={Boolean(actionsIndent)}
        indent={actionsIndent}
        onClose={() => setActionsIndent(null)}
        onMarkClosed={() => { setIndents((items) => items.map((entry) => entry.id === actionsIndent?.id ? { ...entry, status: "Closed" } : entry)); setActionsIndent(null); }}
        onShare={() => setActionsIndent(null)}
        onEdit={() => { if (!actionsIndent) return; setForm({ material: actionsIndent.material, expected: "" }); setActionsIndent(null); setDialogOpen(true); }}
        onDelete={() => { setIndents((items) => items.filter((entry) => entry.id !== actionsIndent?.id)); setActionsIndent(null); }}
      />
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setAddingMaterial(false); }} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "var(--dashboard-container-radius)", p: "var(--dashboard-surface-margin)" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", p: 0, mb: "var(--dashboard-gap)" }}>
          <Box><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>{addingMaterial ? "Add catalog material" : "Create Indent"}</Typography><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>Add material and delivery details</Typography></Box>
          <IconButton aria-label="Close create indent dialog" size="small" onClick={() => { setDialogOpen(false); setAddingMaterial(false); }} sx={{ bgcolor: "var(--palette-grey-100)", borderRadius: "var(--input-border-radius)" }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: "var(--dashboard-gap)", p: 0, overflow: "visible" }}>
          {addingMaterial ? (
            <>
              <TextField autoFocus required label="Material name" value={materialForm.name} onChange={(event) => setMaterialForm((current) => ({ ...current, name: event.target.value }))} />
              <TextField required label="Category" value={materialForm.category} onChange={(event) => setMaterialForm((current) => ({ ...current, category: event.target.value }))} />
              <TextField required label="Unit" value={materialForm.unit} onChange={(event) => setMaterialForm((current) => ({ ...current, unit: event.target.value }))} />
            </>
          ) : (
            <>
              {materials.filter((material) => material.isActive !== false).length === 0 ? (
                <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => { setMaterialForm({ name: "", category: "", unit: "" }); setAddingMaterial(true); }}>Add material</Button>}>
                  Create a catalog material before requesting it.
                </Alert>
              ) : (
                <>
                  <TextField
                    select
                    required
                    label="Material"
                    value={form.materialId}
                    onChange={(event) => setForm((current) => ({ ...current, materialId: event.target.value }))}
                  >
                    {materials.filter((material) => material.isActive !== false).map((material) => (
                      <MenuItem key={material._id} value={material._id}>{material.name} ({material.unit})</MenuItem>
                    ))}
                  </TextField>
                  <Button variant="text" onClick={() => { setMaterialForm({ name: "", category: "", unit: "" }); setAddingMaterial(true); }}>Add another catalog material</Button>
                </>
              )}
              <TextField label="Quantity" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 0.01, step: "any" }} />
              <TextField type="date" label="Expected Delivery" InputLabelProps={{ shrink: true }} value={form.expected} onChange={(event) => setForm((current) => ({ ...current, expected: event.target.value }))} />
              <TextField label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 0, pt: "var(--dashboard-gap)", gap: "var(--dashboard-gap)" }}>
          {addingMaterial && <Button variant="outlined" onClick={() => setAddingMaterial(false)}>Back to indent</Button>}
          <Button variant="outlined" onClick={() => { setDialogOpen(false); setAddingMaterial(false); }}>Cancel</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={addingMaterial ? createCatalogMaterial : createIndent} disabled={saving || loading || !selectedLocationId} style={{ backgroundColor: "var(--palette-primary-main)", color: "var(--palette-primary-contrast-text)", fontWeight: "var(--font-weight-bold)", whiteSpace: "nowrap" }}>{addingMaterial ? "Save material" : "Create Indent"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function IndentDetail({ item, projectName, onBack, onCreatePO, onMarkClosed, onDelete, onEdit }) {
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const closed = item.status === "Closed";
  return (
    <Box sx={{ minHeight: "calc(100vh - var(--dashboard-header-height))", p: "var(--dashboard-surface-margin)", bgcolor: "var(--color-dashboard-canvas)" }}>
      <Paper sx={{ ...surfaceSx, p: { xs: 1.25, sm: 2 }, display: "grid", gap: 1.25 }}>
        <Box sx={{ minHeight: 48, display: "flex", alignItems: "center", gap: 1.5, px: 1.5, borderRadius: "var(--dashboard-container-radius)", bgcolor: closed ? "var(--color-status-chip-completed-text)" : "var(--palette-primary-main)", color: "var(--palette-primary-contrast-text)" }}>
          <IconButton aria-label="Back to indents" onClick={onBack} sx={{ color: "var(--palette-primary-contrast-text)", p: 0.5 }}><ArrowBackIcon /></IconButton>
          <Typography sx={{ color: "var(--palette-primary-contrast-text)", fontSize: "var(--font-body-font-size)", fontWeight: "var(--font-weight-bold)" }}>{item.id}</Typography>
          <Status label={item.status} />
          <Box sx={{ flex: 1 }} />
          <IconButton aria-label="Indent document" sx={{ color: "var(--palette-primary-contrast-text)" }}><DescriptionOutlinedIcon /></IconButton>
          <IconButton aria-label={`More actions for ${item.id}`} onClick={() => setActionsOpen(true)} sx={{ color: "var(--palette-primary-contrast-text)" }}><MoreHorizIcon /></IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, px: 0.5 }}>
          <Status label={closed ? "Fulfilled" : item.delivery || "Not Fulfilled"} />
          <Status label="Ordered" />
        </Box>

        <Paper sx={{ ...surfaceSx, overflow: "hidden" }}>
          <Typography sx={{ px: 1.5, py: 0.75, bgcolor: "var(--gray-100)", color: "var(--color-organization-profile-text)", fontWeight: "var(--font-weight-bold)" }}>Info</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 2, p: 1.5 }}>
            <DetailValue label="Project Name" value={projectName || item.locationId?.name || "—"} />
            <DetailValue label="Expected Delivery" value={item.expected} />
            <DetailValue label="Created By" value={item.createdBy} sub={`${item.created}, 9:07 PM`} />
            <DetailValue label="Assigned to" value="Nitin Founder" />
          </Box>
        </Paper>

        <Paper sx={{ ...surfaceSx, overflow: "hidden" }}>
          <Box sx={{ px: 1.5, py: 0.75, bgcolor: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ color: "var(--color-organization-profile-text)", fontWeight: "var(--font-weight-bold)" }}>Requested Items</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>1 Item</Typography><ExpandLessIcon sx={{ fontSize: "var(--icon-md)", color: "var(--palette-primary-main)" }} /></Box>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "minmax(180px, 1.2fr) minmax(175px, 1.2fr) repeat(2, minmax(120px, 1fr)) auto" }, alignItems: "center", gap: 1.5, p: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar variant="rounded" sx={{ width: 52, height: 52, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)" }}><Icon variant="universal-material" size="lg" gradient={null} /></Avatar>
              <Box><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>{item.material || "Brick"}</Typography><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>Item code: 23345</Typography><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>UOM: set</Typography></Box>
            </Box>
            <Box sx={{ display: "flex", gridColumn: { xs: "1 / -1", lg: "auto" }, alignItems: "center", gap: 0.75, flexWrap: "nowrap", whiteSpace: "nowrap" }}><Status label={closed ? "Fulfilled" : "Not Fulfilled"} /><Status label="Not delivered" /></Box>
            <DetailValue label="Approved Fulfilled Qty" value="0 set" />
            <DetailValue label="Delivered Qty" value="0 set" />
            <Status label="1 set" />
          </Box>
        </Paper>

        <Paper sx={{ ...surfaceSx, overflow: "hidden" }}>
          <Box sx={{ px: 1.5, py: 0.75, bgcolor: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>Remarks and Attachments</Typography><ExpandLessIcon sx={{ fontSize: "var(--icon-md)", color: "var(--palette-primary-main)" }} /></Box>
          <Box sx={{ p: 1.5 }}><Box sx={{ borderRadius: "var(--input-border-radius)", bgcolor: "var(--color-dashboard-canvas)", p: 1.25 }}><Typography sx={{ fontSize: "var(--font-caption-font-size)", color: "var(--color-dashboard-muted-text)" }}>Remark</Typography><Typography sx={{ fontWeight: "var(--font-weight-semibold)" }}>Good.....</Typography></Box></Box>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap", pt: 0.5 }}>
          <Button variant="outlined" style={{ width: "auto", minWidth: "10rem", color: "var(--palette-primary-main)" }}>Fulfill From Stock</Button>
          <Button variant="contained" onClick={onCreatePO} style={{ width: "auto", minWidth: "10rem", backgroundColor: "var(--palette-primary-main)", color: "var(--button-primary-hover-text-color)" }}>Create PO</Button>
        </Box>
      </Paper>
      <IndentActionsModal
        open={actionsOpen}
        indent={item}
        onClose={() => setActionsOpen(false)}
        onMarkClosed={() => { onMarkClosed(item.id); setActionsOpen(false); }}
        onShare={() => setActionsOpen(false)}
        onEdit={() => onEdit(item)}
        onDelete={() => onDelete(item.id)}
      />
    </Box>
  );
}

function DetailValue({ label, value, sub }) {
  return <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: "var(--font-caption-font-size)", color: "var(--color-dashboard-muted-text)", mb: 0.4 }}>{label}</Typography><Typography sx={{ fontSize: "var(--font-body-font-size)", fontWeight: "var(--font-weight-semibold)", overflowWrap: "anywhere" }}>{value}</Typography>{sub && <Typography sx={{ fontSize: "var(--font-caption-font-size)", color: "var(--color-dashboard-muted-text)" }}>{sub}</Typography>}</Box>;
}

function Info({ label, value, sub }) {
  return <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, borderLeft: "1px solid var(--color-dashboard-border)", pl: 2 }}><Typography sx={{ fontSize: "var(--font-caption-font-size)", color: "var(--color-dashboard-muted-text)", mb: 0.5 }}>{label}</Typography><Typography sx={{ fontSize: "var(--font-body-font-size)", fontWeight: "var(--font-weight-semibold)", overflowWrap: "anywhere" }}>{value}</Typography>{sub && <Typography sx={{ fontSize: "var(--font-caption-font-size)", color: "var(--color-dashboard-muted-text)" }}>{sub}</Typography>}</Box>;
}

function Status({ label }) {
  if (!label) return null;
  const closed = label === "Closed";
  const fulfilled = label === "Fulfilled";
  const partial = label === "Partially Delivered";
  const ordered = label === "Ordered";
  const quantity = label === "1 set";
  return <Box component="span" sx={{ px: 1.1, py: 0.35, border: ordered ? "1px solid var(--color-dashboard-nav-active-border)" : "1px solid transparent", borderRadius: "var(--input-border-radius)", bgcolor: quantity ? "var(--color-organization-profile-avatar-surface)" : closed || fulfilled ? "var(--color-status-chip-completed-background)" : partial ? "var(--palette-warning-light)" : label === "Open" || ordered ? "var(--color-dashboard-nav-active)" : "var(--gray-100)", color: quantity ? "var(--palette-primary-main)" : closed || fulfilled ? "var(--color-status-chip-completed-text)" : partial ? "var(--palette-info-dark)" : label === "Open" || ordered ? "var(--palette-primary-main)" : "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)", fontWeight: "var(--font-weight-semibold)", whiteSpace: "nowrap" }}>{label}</Box>;
}
