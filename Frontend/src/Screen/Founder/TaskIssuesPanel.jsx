import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Dialog, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { popupToast as toast } from "../../utils/popupToast.js";
import {
  createTaskIssue,
  getTaskIssue,
  getTaskIssues,
  reassignTaskIssue,
  removeTaskIssueAttachment,
  updateTaskIssue,
  updateTaskIssueStatus,
  uploadTaskIssueAttachments,
} from "../../services/taskService";

const ISSUE_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const errorMessage = (error, fallback) => error.response?.data?.message || fallback;
const personName = (person) => person?.name || person?.email || "Site Engineer";
const personId = (person) => String(person?._id || person || "");
const dateLabel = (value) => value ? new Date(value).toLocaleDateString() : "No due date";

export default function TaskIssuesPanel({ taskId, assignees = [], canEdit = false, socket }) {
  const inputRef = useRef(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAttachment, setRemovingAttachment] = useState("");
  const [files, setFiles] = useState([]);
  const [createForm, setCreateForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "", tags: "" });
  const [editForm, setEditForm] = useState({ title: "", description: "", dueDate: "", tags: "" });

  const refreshIssues = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await getTaskIssues(taskId));
    } catch (error) {
      toast.error(errorMessage(error, "Could not load task issues."));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const openIssue = useCallback(async (issueId) => {
    setIssueLoading(true);
    try {
      const issue = await getTaskIssue(taskId, issueId);
      setSelectedIssue(issue);
      setEditForm({
        title: issue.title || "",
        description: issue.description || "",
        dueDate: issue.dueDate ? String(issue.dueDate).slice(0, 10) : "",
        tags: (issue.tags || []).join(", "),
      });
    } catch (error) {
      toast.error(errorMessage(error, "Could not load issue details."));
    } finally {
      setIssueLoading(false);
    }
  }, [taskId]);

  useEffect(() => { refreshIssues(); }, [refreshIssues]);

  useEffect(() => {
    if (!socket || !taskId) return undefined;
    const eventNames = [
      "task:issue-created", "task:issue-updated", "task:issue-assigned", "task:issue-status-updated",
      "task:issue-attachment-added", "task:issue-attachment-removed",
    ];
    const refreshOnIssueEvent = (payload) => {
      if (String(payload?.taskId || "") !== String(taskId)) return;
      refreshIssues();
      const changedIssueId = payload?.issue?._id || payload?.issueId;
      if (selectedIssue && String(changedIssueId || "") === String(selectedIssue._id)) openIssue(selectedIssue._id);
    };
    eventNames.forEach((name) => socket.on(name, refreshOnIssueEvent));
    return () => eventNames.forEach((name) => socket.off(name, refreshOnIssueEvent));
  }, [socket, taskId, refreshIssues, selectedIssue, openIssue]);

  const refreshSelected = async () => {
    await refreshIssues();
    if (selectedIssue?._id) await openIssue(selectedIssue._id);
  };

  async function handleCreate(event) {
    event.preventDefault();
    setCreateSaving(true);
    try {
      await createTaskIssue(taskId, {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        assignedTo: createForm.assignedTo,
        ...(createForm.dueDate ? { dueDate: new Date(`${createForm.dueDate}T00:00:00`).toISOString() } : {}),
        tags: createForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      setCreateOpen(false);
      setCreateForm({ title: "", description: "", assignedTo: "", dueDate: "", tags: "" });
      await refreshIssues();
      toast.success("Task issue created.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not create task issue."));
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleSaveDetails(event) {
    event.preventDefault();
    if (!selectedIssue) return;
    setSaving(true);
    try {
      await updateTaskIssue(taskId, selectedIssue._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        dueDate: editForm.dueDate ? new Date(`${editForm.dueDate}T00:00:00`).toISOString() : null,
        tags: editForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      await refreshSelected();
      toast.success("Issue details updated.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update issue details."));
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(event) {
    const assignedTo = event.target.value;
    if (!selectedIssue || !assignedTo || personId(selectedIssue.assignedTo) === String(assignedTo)) return;
    setSaving(true);
    try {
      await reassignTaskIssue(taskId, selectedIssue._id, assignedTo);
      await refreshSelected();
      toast.success("Issue reassigned.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not reassign issue."));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(event) {
    const status = event.target.value;
    if (!selectedIssue || status === selectedIssue.status) return;
    setSaving(true);
    try {
      await updateTaskIssueStatus(taskId, selectedIssue._id, status);
      await refreshSelected();
      toast.success("Issue status updated.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update issue status."));
    } finally {
      setSaving(false);
    }
  }

  function chooseFiles(event) {
    const chosen = Array.from(event.target.files || []);
    const valid = chosen.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (chosen.length > 10) toast.error("Choose no more than 10 attachments at a time.");
    if (valid.length !== chosen.length) toast.error("Attachments must be JPG, PNG, or WEBP images up to 5 MB each.");
    setFiles(valid.slice(0, 10));
  }

  async function handleUpload() {
    if (!selectedIssue || !files.length) return;
    setUploading(true);
    try {
      await uploadTaskIssueAttachments(taskId, selectedIssue._id, files);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await refreshSelected();
      toast.success("Issue attachments uploaded.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not upload issue attachments."));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment(attachment) {
    if (!selectedIssue || !attachment?._id) return;
    setRemovingAttachment(attachment._id);
    try {
      await removeTaskIssueAttachment(taskId, selectedIssue._id, attachment._id);
      await refreshSelected();
      toast.success("Issue attachment removed.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not remove issue attachment."));
    } finally {
      setRemovingAttachment("");
    }
  }

  return (
    <Box className="task-progress-description" sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography component="h3">Task Issues</Typography>
        {canEdit && <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>Report issue</Button>}
      </Box>
      {loading ? <Typography color="text.secondary">Loading issues…</Typography> : issues.length ? (
        <Box sx={{ display: "grid", gap: 1 }}>
          {issues.map((issue) => (
            <Button key={issue._id} onClick={() => openIssue(issue._id)} sx={{ display: "block", textAlign: "left", p: 1.5, border: "1px solid #eaecf0", borderRadius: 2, color: "inherit", textTransform: "none" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <strong>{issue.title}</strong><span>{issue.status}</span>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Assigned to {personName(issue.assignedTo)} · Due {dateLabel(issue.dueDate)}
              </Typography>
              {issue.description && <Typography variant="body2" sx={{ mt: 0.5 }}>{issue.description}</Typography>}
            </Button>
          ))}
        </Box>
      ) : <Typography color="text.secondary">No issues have been reported for this task.</Typography>}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleCreate} sx={{ p: 3, display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography component="h2" variant="h6">Report task issue</Typography>
            <IconButton aria-label="Close" onClick={() => setCreateOpen(false)}><CloseRoundedIcon /></IconButton>
          </Box>
          <TextField label="Title" required inputProps={{ maxLength: 200 }} value={createForm.title} onChange={(event) => setCreateForm((form) => ({ ...form, title: event.target.value }))} />
          <TextField label="Description" multiline minRows={3} inputProps={{ maxLength: 3000 }} value={createForm.description} onChange={(event) => setCreateForm((form) => ({ ...form, description: event.target.value }))} />
          <TextField select label="Assign to Site Engineer" required value={createForm.assignedTo} onChange={(event) => setCreateForm((form) => ({ ...form, assignedTo: event.target.value }))}>
            {assignees.map((person) => <MenuItem key={personId(person)} value={personId(person)}>{personName(person)}</MenuItem>)}
          </TextField>
          <TextField label="Due date" type="date" InputLabelProps={{ shrink: true }} value={createForm.dueDate} onChange={(event) => setCreateForm((form) => ({ ...form, dueDate: event.target.value }))} />
          <TextField label="Tags (comma separated)" value={createForm.tags} onChange={(event) => setCreateForm((form) => ({ ...form, tags: event.target.value }))} />
          <Button type="submit" variant="contained" disabled={!createForm.title.trim() || !createForm.assignedTo || createSaving}>{createSaving ? "Creating…" : "Create issue"}</Button>
        </Box>
      </Dialog>

      <Dialog open={Boolean(selectedIssue) || issueLoading} onClose={() => setSelectedIssue(null)} maxWidth="md" fullWidth>
        {issueLoading && !selectedIssue ? <Typography sx={{ p: 3 }}>Loading issue…</Typography> : selectedIssue && (
          <Box sx={{ p: 3, display: "grid", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography component="h2" variant="h6">Issue details</Typography>
              <IconButton aria-label="Close" onClick={() => setSelectedIssue(null)}><CloseRoundedIcon /></IconButton>
            </Box>
            <Box component="form" onSubmit={handleSaveDetails} sx={{ display: "grid", gap: 1.5 }}>
              <TextField label="Title" required inputProps={{ maxLength: 200 }} value={editForm.title} onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))} disabled={!canEdit} />
              <TextField label="Description" multiline minRows={3} inputProps={{ maxLength: 3000 }} value={editForm.description} onChange={(event) => setEditForm((form) => ({ ...form, description: event.target.value }))} disabled={!canEdit} />
              <TextField label="Due date" type="date" InputLabelProps={{ shrink: true }} value={editForm.dueDate} onChange={(event) => setEditForm((form) => ({ ...form, dueDate: event.target.value }))} disabled={!canEdit} />
              <TextField label="Tags (comma separated)" value={editForm.tags} onChange={(event) => setEditForm((form) => ({ ...form, tags: event.target.value }))} disabled={!canEdit} />
              {canEdit && <Button type="submit" variant="contained" startIcon={<EditOutlinedIcon />} disabled={saving || !editForm.title.trim()}>{saving ? "Saving…" : "Save issue details"}</Button>}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField select label="Status" value={selectedIssue.status || "Open"} onChange={handleStatus} disabled={saving}>
                {ISSUE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
              <TextField select label="Assigned Site Engineer" value={personId(selectedIssue.assignedTo)} onChange={handleAssign} disabled={saving}>
                {assignees.map((person) => <MenuItem key={personId(person)} value={personId(person)}>{personName(person)}</MenuItem>)}
              </TextField>
            </Box>
            <Box>
              <Typography component="h3" sx={{ mb: 1 }}>Attachments</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {(selectedIssue.attachments || []).map((attachment) => (
                  <Box key={attachment._id || attachment.key} sx={{ position: "relative", width: 104, height: 90 }}>
                    <a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.originalName || "Issue attachment"} style={{ width: 104, height: 90, objectFit: "cover", borderRadius: 8 }} /></a>
                    {canEdit && <IconButton aria-label={`Remove ${attachment.originalName || "attachment"}`} size="small" disabled={removingAttachment === attachment._id} onClick={() => handleRemoveAttachment(attachment)} sx={{ position: "absolute", top: 2, right: 2, bgcolor: "white" }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>}
                  </Box>
                ))}
                {!selectedIssue.attachments?.length && <Typography color="text.secondary">No attachments.</Typography>}
              </Box>
              {canEdit && <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1.5 }}>
                <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseFiles} />
                <Button variant="outlined" startIcon={<AttachFileOutlinedIcon />} onClick={() => inputRef.current?.click()}>{files.length ? `${files.length} selected` : "Add attachments"}</Button>
                {files.length > 0 && <Button variant="contained" onClick={handleUpload} disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button>}
              </Box>}
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
