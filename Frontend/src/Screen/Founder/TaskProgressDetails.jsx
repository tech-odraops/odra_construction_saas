import { createElement, useEffect, useRef, useState } from "react";
import { Avatar, Box, Button, Dialog, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ChatModal from "../../Components/ChatModal";
import TaskIssuesPanel from "./TaskIssuesPanel";
import { toast } from "react-toastify";
import {
  addTaskAssignees,
  getTaskActivity,
  getTaskProgress,
  recordTaskProgress,
  removeTaskAttachment,
  removeTaskAssignee,
  uploadProgressAttachments,
  uploadTaskAttachments,
} from "../../services/taskService";

function InfoCell({ icon, label, children }) {
  return (
    <Box className="task-progress-info-cell">
      {createElement(icon, { className: "task-progress-info-cell__icon" })}
      <Box>
        <Typography component="span" className="task-progress-info-cell__label">{label}</Typography>
        <Box className="task-progress-info-cell__value">{children}</Box>
      </Box>
    </Box>
  );
}

function DetailPanel({ title, action, icon: Icon, children, className = "" }) {
  return (
    <Box className={`task-progress-panel ${className}`}>
      <Box className="task-progress-panel__heading">
        <Box className="task-progress-panel__title">{Icon && <Icon />}<Typography component="h2">{title}</Typography></Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Not set";

function getPersonId(person) {
  const id = person && typeof person === "object" ? person._id || person.id : person;
  return id == null ? "" : String(id);
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "SE";
}

export default function TaskProgressDetails({
  task,
  projectId,
  projectName,
  assignees = [],
  categories = [],
  units = [],
  canDelete = true,
  canRemoveAssignees = true,
  canEdit = true,
  socket,
  onBack,
  onTaskUpdated,
  onDeleteTask,
}) {
  const photoInputRef = useRef(null);
  const taskPhotoInputRef = useRef(null);
  const taskId = task?._id || task?.id;
  const [progressRecords, setProgressRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [completedQuantity, setCompletedQuantity] = useState("");
  const [progressDescription, setProgressDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [taskPhotos, setTaskPhotos] = useState([]);
  const [uploadingTaskPhotos, setUploadingTaskPhotos] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState("");
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [savingAssignees, setSavingAssignees] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    categoryId: task?.categoryId?._id || "",
    progressUnitId: task?.progressUnitId?._id || "",
    totalQuantity: task?.totalQuantity ?? "",
    startDate: task?.startDate ? String(task.startDate).slice(0, 10) : "",
    endDate: task?.endDate ? String(task.endDate).slice(0, 10) : "",
  });
  const [savingName, setSavingName] = useState(false);
  const onTaskUpdatedRef = useRef(onTaskUpdated);
  const onBackRef = useRef(onBack);

  useEffect(() => { onTaskUpdatedRef.current = onTaskUpdated; }, [onTaskUpdated]);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);
  useEffect(() => {
    setTaskForm({
      title: task?.title || "",
      description: task?.description || "",
      categoryId: task?.categoryId?._id || "",
      progressUnitId: task?.progressUnitId?._id || "",
      totalQuantity: task?.totalQuantity ?? "",
      startDate: task?.startDate ? String(task.startDate).slice(0, 10) : "",
      endDate: task?.endDate ? String(task.endDate).slice(0, 10) : "",
    });
  }, [task]);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    getTaskProgress(taskId)
      .then((records) => { if (active) setProgressRecords(records); })
      .catch((error) => toast.error(error.response?.data?.message || "Could not load task progress history."))
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [taskId]);

  useEffect(() => {
    let active = true;
    setActivityLoading(true);
    setActivityError("");
    getTaskActivity(taskId)
      .then((records) => { if (active) setActivities(records); })
      .catch((error) => {
        if (!active) return;
        const message = error.response?.data?.message || "Could not load the task activity timeline.";
        setActivityError(message);
      })
      .finally(() => { if (active) setActivityLoading(false); });
    return () => { active = false; };
  }, [taskId]);

  useEffect(() => {
    if (!socket || !taskId) return undefined;
    const joinTaskRoom = () => socket.emit("task:join", { taskId });
    const refreshTask = (payload) => {
      const eventTaskId = payload?.taskId || payload?.task?._id;
      if (String(eventTaskId || "") !== String(taskId)) return;
      onTaskUpdatedRef.current?.();
      if (payload.progress || payload.attachments) {
        getTaskProgress(taskId).then(setProgressRecords).catch(() => {});
      }
      getTaskActivity(taskId).then(setActivities).catch(() => {});
    };
    const handleTaskDeleted = (payload) => {
      if (String(payload?.taskId) !== String(taskId)) return;
      toast.info("This task was deleted.");
      onBackRef.current?.();
    };
    const handleRoomError = (error) => toast.error(error?.message || "Could not join task updates.");
    socket.on("connect", joinTaskRoom);
    if (socket.connected) joinTaskRoom();
    ["task:updated", "task:assignee-added", "task:assignee-removed", "task:progress-updated", "task:attachment-added", "task:attachment-removed"].forEach((eventName) => socket.on(eventName, refreshTask));
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("room:error", handleRoomError);
    return () => {
      socket.off("connect", joinTaskRoom);
      ["task:updated", "task:assignee-added", "task:assignee-removed", "task:progress-updated", "task:attachment-added", "task:attachment-removed"].forEach((eventName) => socket.off(eventName, refreshTask));
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("room:error", handleRoomError);
      if (socket.connected) socket.emit("task:leave", { taskId });
    };
  }, [socket, taskId]);

  const totalQuantity = Number(task?.totalQuantity) || 0;
  const currentQuantity = Number(task?.progressQuantity) || 0;
  const progressPercent = totalQuantity > 0 ? Math.min(100, Math.round((currentQuantity / totalQuantity) * 100)) : 0;
  const assignedIds = new Set((task?.assignees || []).map((person) => String(person?._id || person)));
  const availableAssignees = assignees.filter((person) => !assignedIds.has(String(person?._id || person)));
  const assignedProfiles = (task?.assignees || []).map((assignment) => {
    const id = getPersonId(assignment);
    const projectProfile = assignees.find((person) => getPersonId(person) === id);
    return {
      ...(projectProfile && typeof projectProfile === "object" ? projectProfile : {}),
      ...(assignment && typeof assignment === "object" ? assignment : {}),
      _id: id,
    };
  });

  async function handleRecordProgress(event) {
    event.preventDefault();
    const quantity = Number(completedQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a completed quantity greater than zero.");
      return;
    }
    setSubmittingProgress(true);
    try {
      const result = await recordTaskProgress(taskId, {
        completedQuantity: quantity,
        description: progressDescription.trim(),
      });
      let photoUploadFailed = false;
      if (photos.length) {
        try {
          await uploadProgressAttachments(taskId, result.progress._id, photos);
        } catch {
          photoUploadFailed = true;
        }
      }
      onTaskUpdated?.(result.task);
      setCompletedQuantity("");
      setProgressDescription("");
      setPhotos([]);
      getTaskProgress(taskId).then(setProgressRecords).catch(() => {});
      getTaskActivity(taskId).then(setActivities).catch(() => {});
      if (photoUploadFailed) toast.error("Progress was recorded, but photo upload failed.");
      else toast.success("Task progress recorded.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not record task progress.");
    } finally {
      setSubmittingProgress(false);
    }
  }

  function handleChooseTaskPhotos(event) {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
    if (files.length > 10) toast.error("Choose no more than 10 task photos at a time.");
    if (validFiles.length !== files.length) toast.error("Each photo must be 5 MB or smaller.");
    setTaskPhotos(validFiles.slice(0, 10));
  }

  async function handleUploadTaskPhotos() {
    if (!taskPhotos.length) return;
    setUploadingTaskPhotos(true);
    try {
      await uploadTaskAttachments(taskId, taskPhotos);
      setTaskPhotos([]);
      if (taskPhotoInputRef.current) taskPhotoInputRef.current.value = "";
      await onTaskUpdatedRef.current?.();
      getTaskActivity(taskId).then(setActivities).catch(() => {});
      toast.success("Task photos uploaded.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not upload task photos.");
    } finally {
      setUploadingTaskPhotos(false);
    }
  }

  async function handleRemoveTaskPhoto(photo) {
    if (!canEdit || !photo?._id) return;
    const confirmed = window.confirm(`Remove ${photo.originalName || "this photo"} from the task?`);
    if (!confirmed) return;
    setRemovingPhotoId(photo._id);
    try {
      await removeTaskAttachment(taskId, photo._id);
      await onTaskUpdatedRef.current?.();
      getTaskActivity(taskId).then(setActivities).catch(() => {});
      toast.success("Task photo removed.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove task photo.");
    } finally {
      setRemovingPhotoId("");
    }
  }

  async function handleAddAssignee() {
    if (!selectedAssignee) return;
    setSavingAssignees(true);
    try {
      const updatedTask = await addTaskAssignees(taskId, [selectedAssignee]);
      onTaskUpdated?.(updatedTask);
      getTaskActivity(taskId).then(setActivities).catch(() => {});
      setSelectedAssignee("");
      toast.success("Site Engineer assigned to task.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not assign Site Engineer.");
    } finally {
      setSavingAssignees(false);
    }
  }

  async function handleRemoveAssignee(userId) {
    setSavingAssignees(true);
    try {
      const updatedTask = await removeTaskAssignee(taskId, userId);
      onTaskUpdated?.(updatedTask);
      getTaskActivity(taskId).then(setActivities).catch(() => {});
      toast.success("Site Engineer removed from task.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove Site Engineer.");
    } finally {
      setSavingAssignees(false);
    }
  }

  async function handleSaveTaskName(event) {
    event.preventDefault();
    const title = taskForm.title.trim();
    if (!title) return;
    setSavingName(true);
    try {
      await onTaskUpdated?.({
        ...taskForm,
        title,
        totalQuantity: Number(taskForm.totalQuantity),
        startDate: taskForm.startDate || null,
        endDate: taskForm.endDate || null,
      });
      getTaskActivity(taskId).then(setActivities).catch(() => {});
      setEditNameOpen(false);
      toast.success("Task name updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update task name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteTask() {
    try {
      await onDeleteTask?.();
      setDeleteOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete task.");
    }
  }

  const taskCategory = typeof task?.categoryId === "object" ? task.categoryId?.name : "—";
  const unitName = typeof task?.progressUnitId === "object"
    ? task.progressUnitId?.abbreviation || task.progressUnitId?.name
    : "—";
  const photoAttachments = [
    ...(task?.attachments || []),
    ...progressRecords.flatMap((record) => record.attachments || []),
  ];
  const taskAttachmentIds = new Set((task?.attachments || []).map((attachment) => String(attachment._id)));

  return (
    <Box className="task-progress-page">
      <Box className="task-progress-layout">
        <Box className="task-progress-main-column">
          <Box className="task-progress-page__heading">
            <button type="button" className="task-progress-back" onClick={onBack} aria-label="Back to tasks"><ArrowBackRoundedIcon /></button>
            <Typography component="h1">Task Progress</Typography>
            <Box className="task-progress-page__tools">
              {canEdit && <IconButton aria-label="Edit task details" onClick={() => setEditNameOpen(true)}><EditOutlinedIcon /></IconButton>}
              {canDelete && <IconButton aria-label="Delete task" onClick={() => setDeleteOpen(true)}><DeleteOutlineOutlinedIcon /></IconButton>}
            </Box>
          </Box>

          <Box className="task-progress-summary">
            <Box className="task-progress-summary__heading">
              <Box>
                <Typography component="h2">{task.title}</Typography>
                <Typography component="p">{task.description || "No description added yet."}</Typography>
              </Box>
              <Box className="task-progress-summary__status"><span>{task.status || "Pending"}</span><strong>{progressPercent}%</strong></Box>
            </Box>
            <Box sx={{ height: 8, mt: 2, borderRadius: 8, bgcolor: "#f1f3f5", overflow: "hidden" }}>
              <Box sx={{ width: `${progressPercent}%`, height: "100%", bgcolor: "#f97316", transition: "width .2s ease" }} />
            </Box>
            <Typography sx={{ mt: 1, fontSize: 13, color: "#667085" }}>
              {currentQuantity} / {totalQuantity} {unitName}
            </Typography>
          </Box>

          <Box className="task-progress-info-grid">
            <InfoCell icon={CategoryOutlinedIcon} label="Work Category">{taskCategory}</InfoCell>
            <InfoCell icon={PersonOutlineRoundedIcon} label="Assigned To">
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                <Box className="task-progress-assignees">
                  {assignedProfiles.map((person, index) => {
                    const personId = person._id || `assignee-${index}`;
                    const name = person.name || "Site Engineer";
                    const details = [
                      person.email,
                      person.phoneNumber,
                      person.role || "Site Engineer",
                    ].filter(Boolean);
                    return (
                      <Box key={personId} className="task-progress-assignee-item">
                        <Tooltip
                          arrow
                          placement="top"
                          title={(
                            <Box sx={{ display: "grid", gap: 0.25, color: "inherit" }}>
                              <Typography component="span" sx={{ color: "inherit", fontSize: 13, fontWeight: 700 }}>{name}</Typography>
                              {details.map((detail, detailIndex) => (
                                <Typography key={`${detailIndex}-${detail}`} component="span" sx={{ color: "inherit", fontSize: 11 }}>{detail}</Typography>
                              ))}
                            </Box>
                          )}
                        >
                          <Avatar
                            alt={name}
                            src={person.profilePictureThumbnailUrl || undefined}
                            className="task-progress-assignee-avatar"
                          >
                            {getInitials(name)}
                          </Avatar>
                        </Tooltip>
                        {canRemoveAssignees && person._id && (
                          <IconButton
                            size="small"
                            className="task-progress-assignee-remove"
                            aria-label={`Remove ${name}`}
                            onClick={() => handleRemoveAssignee(person._id)}
                            disabled={savingAssignees}
                          >
                            <CloseRoundedIcon fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    );
                  })}
                  {!assignedProfiles.length && <span>Unassigned</span>}
                </Box>
                <TextField select size="small" value={selectedAssignee} onChange={(event) => setSelectedAssignee(event.target.value)} SelectProps={{ displayEmpty: true }} sx={{ minWidth: 150 }} disabled={!canEdit}>
                  <MenuItem value="">Add Site Engineer</MenuItem>
                  {availableAssignees.map((person) => <MenuItem key={person._id} value={person._id}>{person.name || person.email}</MenuItem>)}
                </TextField>
                <Button size="small" onClick={handleAddAssignee} disabled={!canEdit || !selectedAssignee || savingAssignees}>Add</Button>
              </Box>
            </InfoCell>
            <InfoCell icon={CalendarMonthOutlinedIcon} label="Start Date">{task.startDate ? new Date(task.startDate).toLocaleDateString() : "Not set"}</InfoCell>
            <InfoCell icon={CalendarMonthOutlinedIcon} label="End Date">{task.endDate ? new Date(task.endDate).toLocaleDateString() : "Not set"}</InfoCell>
            <InfoCell icon={Inventory2OutlinedIcon} label="Unit for Work Update">{unitName}</InfoCell>
            <InfoCell icon={Inventory2OutlinedIcon} label="Total Qty / Units">{totalQuantity} {unitName}</InfoCell>
          </Box>

          <Box className="task-progress-description">
            <Typography component="h3">Description</Typography>
            <Typography component="p">{task.description || "No task description has been added."}</Typography>
          </Box>

          <TaskIssuesPanel taskId={taskId} assignees={assignees} canEdit={canEdit} socket={socket} />

          <Box component="form" onSubmit={handleRecordProgress} className="task-progress-attachments">
            <Box className="task-progress-attachments__label"><AttachFileOutlinedIcon /><span>Record Work Progress</span></Box>
            <Box sx={{ display: "grid", gap: 1.5, mt: 1 }}>
              <TextField
                required
                label={`Completed quantity (${unitName})`}
                type="number"
                value={completedQuantity}
                onChange={(event) => setCompletedQuantity(event.target.value)}
                inputProps={{ min: 0.01, step: "any" }}
              />
              <TextField label="Progress notes" multiline minRows={2} value={progressDescription} onChange={(event) => setProgressDescription(event.target.value)} />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
                  if (files.length > 10) toast.error("Choose no more than 10 photos.");
                  if (validFiles.length !== files.length) toast.error("Each photo must be 5 MB or smaller.");
                  setPhotos(validFiles.slice(0, 10));
                }}
              />
              <Button type="button" variant="outlined" onClick={() => photoInputRef.current?.click()} startIcon={<AddRoundedIcon />}>
                {photos.length ? `${photos.length} photo(s) selected` : "Add progress photos"}
              </Button>
              <Button type="submit" variant="contained" disabled={!canEdit || submittingProgress || task.status === "Completed"}>
                {submittingProgress ? "Saving progress…" : "Record progress"}
              </Button>
            </Box>
          </Box>
        </Box>

        <Box className="task-progress-side-column">
          <DetailPanel title="Progress Updates" icon={TrendingUpRoundedIcon} className="task-progress-updates">
            {historyLoading ? <Typography>Loading progress history…</Typography> : progressRecords.length ? progressRecords.map((record) => (
              <Box className="task-progress-update" key={record._id}>
                <span className="task-progress-update__percent">+{record.completedQuantity} {unitName}</span>
                <Box className="task-progress-update__content">
                  <strong>{record.description || "Progress recorded"}</strong>
                  <span>{record.updatedBy?.name ? `${record.updatedBy.name} · ` : ""}{formatDate(record.createdAt)}</span>
                </Box>
              </Box>
            )) : <Typography>No progress has been recorded yet.</Typography>}
          </DetailPanel>

          <DetailPanel title="Photos" icon={ImageOutlinedIcon} className="task-progress-photos">
            {photoAttachments.length ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
                {photoAttachments.map((photo, index) => (
                  <Box key={photo.key || photo._id || index} sx={{ position: "relative" }}>
                    <a href={photo.url} target="_blank" rel="noreferrer">
                      <img src={photo.url} alt={photo.originalName || "Task photo"} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }} />
                    </a>
                    {canEdit && taskAttachmentIds.has(String(photo._id)) && (
                      <IconButton
                        size="small"
                        aria-label={`Remove ${photo.originalName || "task photo"}`}
                        onClick={() => handleRemoveTaskPhoto(photo)}
                        disabled={removingPhotoId === photo._id}
                        sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(255,255,255,.94)", "&:hover": { bgcolor: "#fff" } }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            ) : <Box className="task-progress-empty-photos"><ImageOutlinedIcon /><span>No task or progress photos yet</span></Box>}
            <input
              ref={taskPhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={handleChooseTaskPhotos}
            />
            <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
              <Button type="button" variant="outlined" onClick={() => taskPhotoInputRef.current?.click()} startIcon={<AddRoundedIcon />} disabled={!canEdit}>
                {taskPhotos.length ? `${taskPhotos.length} selected` : "Add task photos"}
              </Button>
              {taskPhotos.length > 0 && <Button type="button" variant="contained" onClick={handleUploadTaskPhotos} disabled={uploadingTaskPhotos}>
                {uploadingTaskPhotos ? "Uploading…" : "Upload"}
              </Button>}
            </Box>
          </DetailPanel>

          <DetailPanel title="Activity Timeline" icon={ScheduleOutlinedIcon} className="task-progress-timeline">
            {activityLoading ? <Typography>Loading activity…</Typography> : activityError ? (
              <Typography role="alert" color="error">{activityError}</Typography>
            ) : activities.length ? activities.map((activity) => (
              <Box className="task-progress-timeline-item" key={activity._id}>
                <span className="task-progress-timeline-item__icon"><DescriptionOutlinedIcon /></span>
                <Box>
                  <strong>{activity.description || activity.action?.replaceAll("_", " ")}</strong>
                  <span>{activity.performedBy?.name || activity.performedByRole || "Team member"} · {formatDate(activity.createdAt)}</span>
                </Box>
              </Box>
            )) : <Typography>No activity recorded yet.</Typography>}
          </DetailPanel>
        </Box>
      </Box>

      <Box className="task-progress-footer">
        <ChatModal projectId={projectId} socket={socket} buttonLabel="Chats" buttonClassName="task-progress-chat" buttonStyle={{ width: "100%", minWidth: 0, height: 34 }} buttonSx={{ border: "1px solid #ff642d", borderRadius: "5px", background: "#fff", color: "#ff572d", fontSize: "10px", "&:hover": { background: "#fff", borderColor: "#ff642d" } }} />
        <Typography sx={{ fontSize: 12, color: "#667085" }}>{projectName}</Typography>
      </Box>

      <Dialog open={editNameOpen} onClose={() => setEditNameOpen(false)} maxWidth="sm" fullWidth className="task-name-dialog">
        <Box component="form" onSubmit={handleSaveTaskName}>
          <Box className="task-name-dialog__header">
            <EditOutlinedIcon /><Typography component="h2">Edit Task Details</Typography>
            <IconButton aria-label="Close" onClick={() => setEditNameOpen(false)}><CloseRoundedIcon /></IconButton>
          </Box>
          <Box className="task-name-dialog__body">
            <TextField label="Task name" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required autoFocus fullWidth />
            <TextField label="Description" value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} multiline minRows={2} fullWidth />
            <TextField select label="Category" value={taskForm.categoryId} onChange={(event) => setTaskForm((current) => ({ ...current, categoryId: event.target.value }))} fullWidth>
              {categories.map((category) => <MenuItem key={category._id} value={category._id}>{category.name}</MenuItem>)}
            </TextField>
            <TextField select label="Progress unit" value={taskForm.progressUnitId} onChange={(event) => setTaskForm((current) => ({ ...current, progressUnitId: event.target.value }))} fullWidth>
              {units.map((unit) => <MenuItem key={unit._id} value={unit._id}>{unit.name} ({unit.abbreviation})</MenuItem>)}
            </TextField>
            <TextField label="Total quantity" type="number" value={taskForm.totalQuantity} onChange={(event) => setTaskForm((current) => ({ ...current, totalQuantity: event.target.value }))} inputProps={{ min: 0.01, step: "any" }} required fullWidth />
            <TextField label="Start date" type="date" value={taskForm.startDate} onChange={(event) => setTaskForm((current) => ({ ...current, startDate: event.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="End date" type="date" value={taskForm.endDate} onChange={(event) => setTaskForm((current) => ({ ...current, endDate: event.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
            <Button type="submit" variant="contained" disabled={!taskForm.title.trim() || !taskForm.categoryId || !taskForm.progressUnitId || Number(taskForm.totalQuantity) <= 0 || savingName}>{savingName ? "Saving…" : "Save Changes"}</Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth className="task-delete-dialog">
        <Box className="task-delete-dialog__content">
          <Box className="task-delete-dialog__header">
            <DeleteOutlineOutlinedIcon /><Typography component="h2">Delete Task</Typography>
            <IconButton aria-label="Close" onClick={() => setDeleteOpen(false)}><CloseRoundedIcon /></IconButton>
          </Box>
          <Typography component="p">Are you sure you want to delete <strong>{task.title}</strong>?</Typography>
          <Box className="task-delete-dialog__actions">
            <Button type="button" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="contained" onClick={handleDeleteTask}>Delete</Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
