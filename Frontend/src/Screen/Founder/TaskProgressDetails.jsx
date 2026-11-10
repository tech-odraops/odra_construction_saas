import { useRef, useState } from "react";
import { Box, IconButton, Slider, Typography } from "@mui/material";
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

export default function TaskProgressDetails({ task, projectId, onBack, onUpdateProgress }) {
  const photoInputRef = useRef(null);
  const [progress, setProgress] = useState(Number(task.progress) || 0);
  const [photos, setPhotos] = useState([]);
  const [updates, setUpdates] = useState(initialUpdates);
  const [progressSaved, setProgressSaved] = useState(false);

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
              <IconButton aria-label="Task issues"><WarningAmberOutlinedIcon /></IconButton>
              <IconButton aria-label="Edit task"><EditOutlinedIcon /></IconButton>
              <IconButton aria-label="Delete task"><DeleteOutlineOutlinedIcon /></IconButton>
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
          triggerClassName="task-progress-chat-trigger"
          trigger={<button type="button" className="task-progress-chat">Chats</button>}
        />
        <button type="button" className="task-progress-submit" onClick={handleUpdateProgress} disabled={progressSaved}>Update Progress</button>
      </Box>
    </Box>
  );
}
