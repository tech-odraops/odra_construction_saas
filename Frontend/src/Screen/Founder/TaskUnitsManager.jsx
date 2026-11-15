import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { toast } from "react-toastify";
import { createTaskUnit, deleteTaskUnit, getTaskUnits, updateTaskUnit } from "../../services/taskService";

const emptyForm = { name: "", abbreviation: "", description: "" };

export default function TaskUnitsManager({ open, onClose, onUnitsChange }) {
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function refreshUnits() {
    const nextUnits = await getTaskUnits();
    setUnits(nextUnits);
    onUnitsChange?.(nextUnits);
    return nextUnits;
  }

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    getTaskUnits()
      .then((nextUnits) => {
        if (!active) return;
        setUnits(nextUnits);
        onUnitsChange?.(nextUnits);
      })
      .catch((error) => toast.error(error.response?.data?.message || "Could not load task units."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, onUnitsChange]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(unit) {
    setEditingId(unit._id);
    setForm({ name: unit.name || "", abbreviation: unit.abbreviation || "", description: unit.description || "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      abbreviation: form.abbreviation.trim(),
      description: form.description.trim(),
    };
    if (!payload.name || !payload.abbreviation) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTaskUnit(editingId, payload);
        toast.success("Task unit updated.");
      } else {
        await createTaskUnit(payload);
        toast.success("Task unit created.");
      }
      resetForm();
      await refreshUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save task unit.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(unit) {
    try {
      await updateTaskUnit(unit._id, { isActive: unit.isActive === false });
      await refreshUnits();
      toast.success(unit.isActive === false ? "Task unit activated." : "Task unit deactivated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update task unit status.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaskUnit(deleteTarget._id);
      setDeleteTarget(null);
      if (editingId === deleteTarget._id) resetForm();
      await refreshUnits();
      toast.success("Task unit deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete task unit.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="task-units-title">
        <DialogTitle id="task-units-title" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Manage Task Units
          <IconButton aria-label="Close" onClick={onClose}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            Define the measurement units used when creating tasks and recording completed work.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mb: 3 }}>
            <TextField
              label="Unit name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              inputProps={{ maxLength: 100 }}
              required
              fullWidth
            />
            <TextField
              label="Abbreviation"
              value={form.abbreviation}
              onChange={(event) => setForm((current) => ({ ...current, abbreviation: event.target.value }))}
              inputProps={{ maxLength: 20 }}
              required
              fullWidth
            />
            <TextField
              label="Description (optional)"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              inputProps={{ maxLength: 500 }}
              sx={{ gridColumn: { sm: "1 / -1" } }}
              fullWidth
            />
            <Box sx={{ display: "flex", gap: 1, gridColumn: { sm: "1 / -1" } }}>
              <Button type="submit" variant="contained" startIcon={editingId ? <EditOutlinedIcon /> : <AddRoundedIcon />} disabled={saving || !form.name.trim() || !form.abbreviation.trim()}>
                {saving ? "Saving…" : editingId ? "Save Unit" : "Add Unit"}
              </Button>
              {editingId && <Button type="button" onClick={resetForm} disabled={saving}>Cancel edit</Button>}
            </Box>
          </Box>

          <Typography variant="h6" sx={{ mb: 1 }}>Organization units</Typography>
          {loading ? <Typography sx={{ py: 2 }}>Loading units…</Typography> : units.length === 0 ? (
            <Typography sx={{ py: 2, color: "text.secondary" }}>No task units yet. Add a unit above.</Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1 }}>
              {units.map((unit) => (
                <Box key={unit._id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, opacity: unit.isActive === false ? 0.65 : 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{unit.name} <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>({unit.abbreviation})</Box></Typography>
                    {unit.description && <Typography variant="body2" color="text.secondary">{unit.description}</Typography>}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="caption">{unit.isActive === false ? "Inactive" : "Active"}</Typography>
                    <Switch checked={unit.isActive !== false} onChange={() => toggleActive(unit)} inputProps={{ "aria-label": `Toggle ${unit.name} active status` }} />
                    <IconButton aria-label={`Edit ${unit.name}`} onClick={() => startEditing(unit)}><EditOutlinedIcon /></IconButton>
                    <IconButton aria-label={`Delete ${unit.name}`} color="error" onClick={() => setDeleteTarget(unit)}><DeleteOutlineRoundedIcon /></IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete task unit?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? The backend will prevent deletion while any task uses this unit.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
