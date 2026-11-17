import { useRef, useState } from "react";
import { Box, Button, Dialog, IconButton, Slider, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChatModal from "../../Components/ChatModal";

const initialUpdates = [
  { progress: 60, text: "Work done on ceiling framework.", date: "27 Oct 2026, 02:30 PM" },
  { progress: 40, text: "Material delivered on site.", date: "25 Oct 2026, 11:15 AM" },
  { progress: 20, text: "Initial marking completed.", date: "22 Oct 2026, 09:10 AM" },
];

function InfoCell({ icon: Icon, label, children }) {
  return (
    <Box className="task-progress-info-cell">
      <Icon className="task-progress-info-cell__icon" />
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
        <Box className="task-progress-panel__title">
          {Icon && <Icon />}
          <Typography component="h2">{title}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export default function TaskProgressDetails({ task, projectId, projectName, assignees = [], onBack, onUpdateProgress, onUpdateTaskName, onDeleteTask }) {
  const photoInputRef = useRef(null);
  const issueFilesRef = useRef(null);
  const [progress, setProgress] = useState(Number(task.progress) || 0);
  const [photos, setPhotos] = useState([]);
  const [updates, setUpdates] = useState(initialUpdates);
  const [progressSaved, setProgressSaved] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskName, setTaskName] = useState(task.name || "");
  const [issueFiles, setIssueFiles] = useState([]);
  const [issue, setIssue] = useState({ description: "", dueDate: "", assignedTo: "", tag: "" });
  const [issueError, setIssueError] = useState("");

  function handleCreateIssue(event) {
    event.preventDefault();
    if (!issue.description.trim()) {
      setIssueError("Please add an issue description.");
      return;
    }
    setIssue({ description: "", dueDate: "", assignedTo: "", tag: "" });
    setIssueFiles([]);
    setIssueError("");
    setIssueOpen(false);
  }

  function handleSaveTaskName(event) {
    event.preventDefault();
    const nextName = taskName.trim();
    if (!nextName) return;
    onUpdateTaskName?.(nextName);
    setEditNameOpen(false);
  }

  function handleDeleteTask() {
    onDeleteTask?.();
    setDeleteOpen(false);
  }

  function handleUpdateProgress() {
    const update = {
      progress,
      text: `Progress updated to ${progress}%.`,
      date: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
    };
    setUpdates((current) => [update, ...current]);
    setProgressSaved(true);
    onUpdateProgress?.(progress);
  }

  return (
    <Box className="task-progress-page">
      <Box className="task-progress-layout">
        <Box className="task-progress-main-column">
          <Box className="task-progress-page__heading">
            <button type="button" className="task-progress-back" onClick={onBack} aria-label="Back to tasks"><ArrowBackRoundedIcon /></button>
            <Typography component="h1">Task Progress</Typography>
            <Box className="task-progress-page__tools">
              <IconButton aria-label="Create new issue" onClick={() => setIssueOpen(true)}><WarningAmberOutlinedIcon /></IconButton>
              <IconButton aria-label="Edit task name" onClick={() => { setTaskName(task.name || ""); setEditNameOpen(true); }}><EditOutlinedIcon /></IconButton>
              <IconButton aria-label="Delete task" onClick={() => setDeleteOpen(true)}><DeleteOutlineOutlinedIcon /></IconButton>
              <IconButton aria-label="More task actions"><MoreVertRoundedIcon /></IconButton>
            </Box>
          </Box>

          <Box className="task-progress-summary">
            <Box className="task-progress-summary__heading">
              <Box>
                <Typography component="h2">{task.name}</Typography>
                <Typography component="p">{task.description || "No description added yet."}</Typography>
              </Box>
              <Box className="task-progress-summary__status">
                <span>{task.status || "In Progress"}</span>
                <strong>{progress}%</strong>
              </Box>
            </Box>
            <Slider
              value={progress}
              onChange={(_, value) => {
                setProgress(value);
                setProgressSaved(false);
              }}
              aria-label="Task completion progress"
              min={0}
              max={100}
              className="task-progress-summary__slider"
            />
          </Box>

          <Box className="task-progress-info-grid">
            <InfoCell icon={CategoryOutlinedIcon} label="Work Category">{task.category || "General"}</InfoCell>
            <InfoCell icon={PersonOutlineRoundedIcon} label="Assigned To">
              <span className="task-progress-assignee">SK</span>
              <span className="task-progress-assignee">RP</span>
              <span className="task-progress-assignee">JD</span>
              <button type="button" className="task-progress-add-assignee">+ Add Assignee</button>
            </InfoCell>
            <InfoCell icon={CalendarMonthOutlinedIcon} label="Start Date">{task.startDate || "Not set"}</InfoCell>
            <InfoCell icon={CalendarMonthOutlinedIcon} label="End Date">{task.endDate || "Not set"}</InfoCell>
            <InfoCell icon={Inventory2OutlinedIcon} label="Unit for Work Update">
              <select aria-label="Unit for work update" defaultValue="% (Percent)">
                <option>% (Percent)</option>
                <option>Quantity</option>
              </select>
            </InfoCell>
            <InfoCell icon={Inventory2OutlinedIcon} label="Total Qty / Units">
              <span className="task-progress-quantity">{task.quantity ?? "—"}</span>
              <span className="task-progress-quantity">{task.unit || "—"}</span>
            </InfoCell>
          </Box>

          <Box className="task-progress-description">
            <Typography component="h3">Description</Typography>
            <Typography component="p">{task.description || "No task description has been added."}</Typography>
          </Box>

          <Box className="task-progress-attachments">
            <Box className="task-progress-attachments__label"><AttachFileOutlinedIcon /><span>Attachments <small>(Optional)</small></span></Box>
            <input ref={photoInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => setPhotos(Array.from(event.target.files || []))} />
            <button type="button" onClick={() => photoInputRef.current?.click()}>
              <AddRoundedIcon />
              <span>{photos.length ? `${photos.length} file${photos.length === 1 ? "" : "s"} selected` : "Add photos"}</span>
            </button>
          </Box>
        </Box>

        <Box className="task-progress-side-column">
          <DetailPanel
            title="Progress Updates"
            icon={TrendingUpRoundedIcon}
            action={<button type="button" className="task-progress-view-all">View all <span>›</span></button>}
            className="task-progress-updates"
          >
            {updates.slice(0, 3).map((update, index) => (
              <Box className="task-progress-update" key={`${update.date}-${index}`}>
                <span className="task-progress-update__percent">{update.progress}%</span>
                <Box className="task-progress-update__content">
                  <strong>{update.text}</strong>
                  <span>{update.date}</span>
                </Box>
                <MoreVertRoundedIcon className="task-progress-update__menu" />
              </Box>
            ))}
          </DetailPanel>

          <DetailPanel
            title="Photos/Videos"
            icon={ImageOutlinedIcon}
            action={<button type="button" className="task-progress-view-all">View all <span>›</span></button>}
            className="task-progress-photos"
          >
            {photos.length ? (
              <Box className="task-progress-photo-count">{photos.length} attachment{photos.length === 1 ? "" : "s"} selected</Box>
            ) : (
              <Box className="task-progress-empty-photos"><ImageOutlinedIcon /><span>No photos added yet</span></Box>
            )}
            <button type="button" className="task-progress-add-photos" onClick={() => photoInputRef.current?.click()}><AddRoundedIcon /> Add Photos</button>
          </DetailPanel>

          <DetailPanel
            title="Timeline"
            icon={ScheduleOutlinedIcon}
            action={<button type="button" className="task-progress-view-all">View all <span>›</span></button>}
            className="task-progress-timeline"
          >
            <Box className="task-progress-timeline-item">
              <span className="task-progress-timeline-item__icon"><DescriptionOutlinedIcon /></span>
              <Box><strong>Task Created</strong><span>27 Oct 2026, 01:20 PM | Project Founder</span></Box>
            </Box>
            <Box className="task-progress-timeline-item">
              <span className="task-progress-timeline-item__icon"><AutorenewRoundedIcon /></span>
              <Box><strong>Status Changed to {task.status || "In Progress"}</strong><span>27 Oct 2026, 02:30 PM | Project Founder</span></Box>
            </Box>
          </DetailPanel>
        </Box>
      </Box>

      <Box className="task-progress-footer">
        <ChatModal
          projectId={projectId}
          buttonLabel="Chats"
          buttonClassName="task-progress-chat"
          buttonStyle={{ width: "100%", minWidth: 0, height: 34 }}
          buttonSx={{
            border: "1px solid #ff642d",
            borderRadius: "5px",
            background: "#fff",
            color: "#ff572d",
            fontSize: "10px",
            "&:hover": { background: "#fff", borderColor: "#ff642d" },
          }}
        />
        <button type="button" className="task-progress-submit" onClick={handleUpdateProgress} disabled={progressSaved}>Update Progress</button>
      </Box>

      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} maxWidth="sm" fullWidth className="issue-dialog">
        <Box component="form" onSubmit={handleCreateIssue} className="issue-modal">
          <Box className="issue-modal__header">
            <WarningAmberOutlinedIcon />
            <Typography component="h2">Create New Issue</Typography>
          </Box>
          <Box className="issue-modal__body">
            <Box className="issue-modal__grid">
              <label>Project Name<input value={projectName || ""} readOnly /></label>
              <label>Linked Task<input value={task.name || ""} readOnly /></label>
            </Box>
            <label>Issue Description<textarea rows={3} placeholder="Briefly explain your issue..." value={issue.description} onChange={(event) => setIssue({ ...issue, description: event.target.value })} /></label>
            <Box className="issue-modal__grid">
              <label>Due Date<input type="date" value={issue.dueDate} onChange={(event) => setIssue({ ...issue, dueDate: event.target.value })} /></label>
              <label>Assigned to<select value={issue.assignedTo} onChange={(event) => setIssue({ ...issue, assignedTo: event.target.value })}><option value="">Assign issue to someone</option>{assignees.map((person) => <option key={person._id || person.id || person.name} value={person._id || person.id || person.name}>{person.name || person.fullName || person.email}</option>)}</select></label>
            </Box>
            <label>Tags<select value={issue.tag} onChange={(event) => setIssue({ ...issue, tag: event.target.value })}><option value="">Choose a tag to group issue by category</option><option>Safety</option><option>Materials</option><option>Quality</option><option>Delay</option><option>Other</option></select></label>
            <label className="issue-modal__attachment-label">Add Attachments <span>(Supports up to 200 MB per file)</span></label>
            <input ref={issueFilesRef} className="issue-modal__file-input" type="file" accept="image/*,video/*,.pdf" multiple onChange={(event) => { const files = Array.from(event.target.files || []); const oversized = files.find((file) => file.size > 200 * 1024 * 1024); if (files.length > 10 || oversized) { setIssueError(files.length > 10 ? "You can attach up to 10 files." : "Each file must be 200 MB or smaller."); return; } setIssueError(""); setIssueFiles(files); }} />
            <button type="button" className="issue-modal__dropzone" onClick={() => issueFilesRef.current?.click()}><AttachFileRoundedIcon /><strong>{issueFiles.length ? `${issueFiles.length} file${issueFiles.length === 1 ? "" : "s"} selected` : "Add Attachments"}</strong><span>Up to 10 photos, videos or PDF files</span></button>
            {issueError && <Typography className="issue-modal__error" role="alert">{issueError}</Typography>}
          </Box>
          <Box className="issue-modal__actions"><Button type="button" onClick={() => setIssueOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create Issue</Button></Box>
        </Box>
      </Dialog>

      <Dialog open={editNameOpen} onClose={() => setEditNameOpen(false)} maxWidth="xs" fullWidth className="task-name-dialog">
        <Box component="form" onSubmit={handleSaveTaskName}>
          <Box className="task-name-dialog__header">
            <EditOutlinedIcon />
            <Typography component="h2">Change Task Name</Typography>
            <IconButton aria-label="Close" onClick={() => setEditNameOpen(false)}><CloseRoundedIcon /></IconButton>
          </Box>
          <Box className="task-name-dialog__body">
            <label htmlFor="task-name-input">Task Name <span>*</span></label>
            <input id="task-name-input" value={taskName} onChange={(event) => setTaskName(event.target.value)} autoFocus required />
            <Button type="submit" variant="contained" disabled={!taskName.trim()}>Save Changes</Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth className="task-delete-dialog">
        <Box className="task-delete-dialog__content">
          <Box className="task-delete-dialog__header">
            <DeleteOutlineOutlinedIcon />
            <Typography component="h2">Delete Task</Typography>
            <IconButton aria-label="Close" onClick={() => setDeleteOpen(false)}><CloseRoundedIcon /></IconButton>
          </Box>
          <Typography component="p">Are you sure you want to delete <strong>{task.name}</strong> task?</Typography>
          <Box className="task-delete-dialog__actions">
            <Button type="button" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="contained" onClick={handleDeleteTask}>Delete</Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
