import React from "react";
import {
  Avatar, Box, Dialog, DialogActions, DialogContent, DialogTitle,
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

const initialIndents = [
  { id: "MT005", createdBy: "Bibhuti Pradhan", created: "12 Nov", expected: "30 Nov, 2026", material: "Brick", status: "Open", delivery: "Not Fulfilled" },
  { id: "MT004", createdBy: "Nitin Founder", created: "12 Nov", expected: "28 Nov, 2026", material: "brick", status: "Closed", delivery: "Partially Delivered" },
  { id: "MT003", createdBy: "Nitin Founder", created: "11 Nov", expected: "-", material: "brick", status: "Closed", delivery: "" },
];

const surfaceSx = { bgcolor: "var(--color-dashboard-surface)", border: "1px solid var(--color-dashboard-border)", borderRadius: "var(--dashboard-container-radius)", boxShadow: "none" };

export default function Material({ embedded = false }) {
  const [area, setArea] = React.useState("Procurement");
  const [tab, setTab] = React.useState(0);
  const [indents, setIndents] = React.useState(initialIndents);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ material: "", expected: "" });
  const [actionsIndent, setActionsIndent] = React.useState(null);
  const [selectedIndent, setSelectedIndent] = React.useState(null);
  const [creatingPO, setCreatingPO] = React.useState(false);
  const [poStep, setPoStep] = React.useState(1);

  const createIndent = () => {
    if (!form.material.trim()) return;
    const nextNumber = String(6 + indents.length - initialIndents.length).padStart(3, "0");
    setIndents((items) => [{ id: `MT${nextNumber}`, createdBy: localStorage.getItem("name") || "You", created: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date()), expected: form.expected ? new Date(`${form.expected}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-", material: form.material.trim(), status: "Open", delivery: "Not Fulfilled" }, ...items]);
    setForm({ material: "", expected: "" });
    setDialogOpen(false);
  };

  if (selectedIndent) {
    if (creatingPO) return <CreatePurchaseOrder item={selectedIndent} step={poStep} onStepChange={setPoStep} onBack={() => { if (poStep === 2) setPoStep(1); else { setCreatingPO(false); setPoStep(1); } }} />;
    return <IndentDetail
      item={selectedIndent}
      onBack={() => setSelectedIndent(null)}
      onCreatePO={() => setCreatingPO(true)}
      onMarkClosed={(id) => { setIndents((items) => items.map((entry) => entry.id === id ? { ...entry, status: "Closed" } : entry)); setSelectedIndent((item) => item ? { ...item, status: "Closed" } : item); }}
      onDelete={(id) => { setIndents((items) => items.filter((entry) => entry.id !== id)); setSelectedIndent(null); }}
      onEdit={(item) => { setForm({ material: item.material, expected: "" }); setSelectedIndent(null); setDialogOpen(true); }}
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

        {area === "Procurement" ? <>
          <Tabs value={tab} onChange={(_e, value) => setTab(value)} aria-label="Procurement sections" sx={{ minHeight: 44, borderBottom: "1px solid var(--color-dashboard-border)", mb: 1.5, "& .MuiTab-root": { minHeight: 44, minWidth: 72, px: 2, textTransform: "none", fontWeight: "var(--font-weight-semibold)", color: "var(--color-dashboard-muted-text)" }, "& .Mui-selected": { color: "var(--palette-primary-main) !important" }, "& .MuiTabs-indicator": { height: 3, borderRadius: "var(--dashboard-button-radius) var(--dashboard-button-radius) 0 0", bgcolor: "var(--palette-primary-main)" } }}>
            <Tab label="Indent" /><Tab label="Deliveries" /><Tab label="Site GRN" />
          </Tabs>
          {tab === 0 ? <Box sx={{ display: "grid", gap: 1 }}>
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
            {!indents.length && <Typography sx={{ py: 5, textAlign: "center", color: "var(--color-dashboard-muted-text)" }}>No indents yet. Create an indent to get started.</Typography>}
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "var(--dashboard-container-radius)", p: "var(--dashboard-surface-margin)" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", p: 0, mb: "var(--dashboard-gap)" }}>
          <Box><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>Create Indent</Typography><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>Add material and delivery details</Typography></Box>
          <IconButton aria-label="Close create indent dialog" size="small" onClick={() => setDialogOpen(false)} sx={{ bgcolor: "var(--palette-grey-100)", borderRadius: "var(--input-border-radius)" }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: "var(--dashboard-gap)", p: 0, overflow: "visible" }}>
          <TextField autoFocus required label="Material" value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} />
          <TextField type="date" label="Expected Delivery" InputLabelProps={{ shrink: true }} value={form.expected} onChange={(event) => setForm({ ...form, expected: event.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 0, pt: "var(--dashboard-gap)", gap: "var(--dashboard-gap)" }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={createIndent} disabled={!form.material.trim()} style={{ backgroundColor: "var(--palette-primary-main)", color: "var(--palette-primary-contrast-text)", fontWeight: "var(--font-weight-bold)", whiteSpace: "nowrap" }}>Create Indent</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function IndentDetail({ item, onBack, onCreatePO, onMarkClosed, onDelete, onEdit }) {
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
            <DetailValue label="Project Name" value="Bibhuti Complex" />
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
