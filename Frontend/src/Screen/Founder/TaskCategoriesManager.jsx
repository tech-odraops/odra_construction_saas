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
import usePopup from "../../contexts/usePopup";
import { createTaskCategory, deleteTaskCategory, getTaskCategories, updateTaskCategory } from "../../services/taskService";

const emptyForm = { name: "", description: "", icon: "" };
const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

export default function TaskCategoriesManager({ open, onClose, onCategoriesChange }) {
  const { showPopup } = usePopup();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function refreshCategories() {
    const nextCategories = await getTaskCategories();
    setCategories(nextCategories);
    onCategoriesChange?.(nextCategories);
    return nextCategories;
  }

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    getTaskCategories()
      .then((nextCategories) => {
        if (!active) return;
        setCategories(nextCategories);
        onCategoriesChange?.(nextCategories);
      })
      .catch((error) => showPopup({
        variant: "error",
        title: "Could not load task categories",
        message: errorMessage(error, "Could not load task categories."),
      }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, onCategoriesChange, showPopup]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(category) {
    setEditingId(category._id);
    setForm({ name: category.name || "", description: category.description || "", icon: category.icon || "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim() || null,
    };
    if (!payload.name) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTaskCategory(editingId, payload);
        showPopup({ variant: "success", title: "Task category updated", message: "Changes were saved." });
      } else {
        await createTaskCategory(payload);
        showPopup({ variant: "success", title: "Task category created", message: "The new category is ready to use." });
      }
      resetForm();
      await refreshCategories();
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Could not save task category",
        message: errorMessage(error, "Could not save task category."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category) {
    try {
      await updateTaskCategory(category._id, { isActive: category.isActive === false });
      await refreshCategories();
      showPopup({
        variant: "success",
        title: category.isActive === false ? "Task category activated" : "Task category deactivated",
        message: `${category.name} is now ${category.isActive === false ? "active" : "inactive"}.`,
      });
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Could not update task category",
        message: errorMessage(error, "Could not update task category status."),
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaskCategory(deleteTarget._id);
      setDeleteTarget(null);
      if (editingId === deleteTarget._id) resetForm();
      await refreshCategories();
      showPopup({ variant: "success", title: "Task category deleted", message: "The category was removed." });
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Could not delete task category",
        message: errorMessage(error, "Could not delete task category."),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="task-categories-title">
        <DialogTitle id="task-categories-title" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Manage Task Categories
          <IconButton aria-label="Close" onClick={onClose}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            Organize reusable work categories for tasks in your organization.
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mb: 3 }}>
            <TextField label="Category name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} inputProps={{ maxLength: 100 }} required fullWidth />
            <TextField label="Icon name (optional)" value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} inputProps={{ maxLength: 100 }} fullWidth />
            <TextField label="Description (optional)" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} inputProps={{ maxLength: 500 }} sx={{ gridColumn: { sm: "1 / -1" } }} fullWidth />
            <Box sx={{ display: "flex", gap: 1, gridColumn: { sm: "1 / -1" } }}>
              <Button type="submit" variant="contained" startIcon={editingId ? <EditOutlinedIcon /> : <AddRoundedIcon />} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : editingId ? "Save Category" : "Add Category"}
              </Button>
              {editingId && <Button type="button" onClick={resetForm} disabled={saving}>Cancel edit</Button>}
            </Box>
          </Box>

          <Typography variant="h6" sx={{ mb: 1 }}>Organization categories</Typography>
          {loading ? <Typography sx={{ py: 2 }}>Loading categories…</Typography> : categories.length === 0 ? (
            <Typography sx={{ py: 2, color: "text.secondary" }}>No task categories yet. Add a category above.</Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1 }}>
              {categories.map((category) => (
                <Box key={category._id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, opacity: category.isActive === false ? 0.65 : 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{category.name}{category.icon ? <Box component="span" sx={{ ml: 1, color: "text.secondary", fontWeight: 400 }}>({category.icon})</Box> : null}</Typography>
                    {category.description && <Typography variant="body2" color="text.secondary">{category.description}</Typography>}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="caption">{category.isActive === false ? "Inactive" : "Active"}</Typography>
                    <Switch checked={category.isActive !== false} onChange={() => toggleActive(category)} inputProps={{ "aria-label": `Toggle ${category.name} active status` }} />
                    <IconButton aria-label={`Edit ${category.name}`} onClick={() => startEditing(category)}><EditOutlinedIcon /></IconButton>
                    <IconButton aria-label={`Delete ${category.name}`} color="error" onClick={() => setDeleteTarget(category)}><DeleteOutlineRoundedIcon /></IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete task category?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? The backend prevents deletion while any task uses this category.
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
