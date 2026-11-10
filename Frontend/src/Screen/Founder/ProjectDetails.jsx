import React, { useEffect, useState, useRef } from 'react';
import Footer from '../../Components/Footer';
import WageModal from "../../Components/WageModal";
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import Button from '../../Components/atoms/Button/Button';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import ChatModal from '../../Components/ChatModal';
import axiosInstance from '../../utils/axiosInstance';
import { useTranslation } from "react-i18next";
import LockIcon from "@mui/icons-material/Lock";
import MiscExpenseModal from "../../Components/MiscExpenseModal";
import AddMiscExpenseModal from "../../Components/AddMiscExpenseModal";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import StatusChips from "../../Components/atoms/StatusChips/StatusChips";
import Reports from "./Reports";
import CreateTaskForm from "./CreateTaskForm";
import TaskProgressDetails from "./TaskProgressDetails";

function getAssignedSiteEngineers(project) {
  const engineers = [
    ...(Array.isArray(project?.siteEngineers) ? project.siteEngineers : []),
    project?.siteEngineer,
  ].filter(Boolean);
  const seenIds = new Set();

  return engineers.filter((engineer) => {
    const id = typeof engineer === "object" ? engineer?._id : engineer;
    if (!id) return true;

    const normalizedId = id.toString();
    if (seenIds.has(normalizedId)) return false;
    seenIds.add(normalizedId);
    return true;
  });
}

function getAssignedSiteEngineerIds(project) {
  return new Set(
    getAssignedSiteEngineers(project)
      .map((engineer) => (typeof engineer === "object" ? engineer?._id : engineer))
      .filter(Boolean)
      .map((id) => id.toString())
  );
}

function OverviewBuildingIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V3.5c0-.55.45-1 1-1h9c.55 0 1 .45 1 1V21M15 9h4c.55 0 1 .45 1 1v11M2.5 21h19" /><path d="M7 6h1M11 6h1M7 9h1M11 9h1M7 12h1M11 12h1M7 15h1M11 15h1M17 12h1M17 15h1M17 18h1M9.5 21v-3h2v3" /></svg>;
}

function OverviewFlagIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v18" /><path d="M6 4c4-3 8 3 13 0v9c-5 3-9-3-13 0V4Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" /></svg>;
}

function SiteEngineerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21c.4-3.3 3-5.5 8-5.5s7.6 2.2 8 5.5" /><path d="M7 10a5 5 0 0 1 10 0v2H7v-2Z" /><path d="M5.5 10h13M12 4V2.5M8.5 5.5l-1-1M15.5 5.5l1-1" /><path d="M9 12v1.2a3 3 0 0 0 6 0V12" /></svg>;
}

function InventoryCubeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 9 4.7v9.6l-9 4.7-9-4.7V7.2l9-4.7Z" fill="currentColor" /><path d="m3.5 7.4 8.5 4.5 8.5-4.5M12 12v9" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
// import { toast } from 'react-toastify';
import {
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Popover,
} from "@mui/material";
import FullScreenLoader from "../../Components/FullScreenLoader"

export default function ProjectDetails({ isSiteEngineer = false }) {
  const [openMiscModal, setOpenMiscModal] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskOverrides, setTaskOverrides] = useState({});
  const [openInventoryModal, setOpenInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    unit: "",
    supplierName: "",
    companyName: "",
    quantity: "",
    pricePerUnit: "",
    purchaseDate: new Date().toISOString().split("T")[0],
  });
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [openWageModal, setOpenWageModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [siteMembers, setSiteMembers] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState("");
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Site Engineer");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [scheduleAnchor, setScheduleAnchor] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState([]);
  const [scheduleFilter, setScheduleFilter] = useState([]);
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [statusDraft, setStatusDraft] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [categoryAnchor, setCategoryAnchor] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const { id } = useParams();
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const projectListPath = isSiteEngineer ? "/site-engineer/projects" : "/founder/project";
  const overviewTitle = t("project.project_overview");
  const overviewTitleSplit = overviewTitle.lastIndexOf(" ");
  const assignedSiteEngineers = getAssignedSiteEngineers(project);
  const assignedSiteEngineerIds = getAssignedSiteEngineerIds(project);
  const actionTabs = [
    { label: "Overview" },
    { label: "Report", icon: DescriptionOutlinedIcon },
    { label: "Task", icon: TaskAltOutlinedIcon },
    { label: "Material", icon: Inventory2OutlinedIcon },
    { label: "Attendance", icon: CalendarMonthOutlinedIcon },
    { label: "Misc Expenses", icon: MonetizationOnOutlinedIcon },
  ];

  const mockTasks = [
    { id: "TSK000003", name: "shd trial", progress: 7, status: "In Progress" },
    { id: "TSK000001", name: "building", progress: 10, status: "Completed", issueCount: 2, issueRange: "10/10/26 - 25/10/26" },
    { id: "TSK000002", name: "work 2", progress: 55, status: "In Progress" },
  ];
  const allTasks = [...mockTasks, ...createdTasks].map((task) => ({ ...task, ...taskOverrides[task.id] }));
  const visibleTasks = statusFilter.length
    ? allTasks.filter((task) => statusFilter.includes(task.status))
    : allTasks;

  const renderTasksSection = () => (
    <Box sx={{ width: "100%", pt: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Typography sx={{ fontSize: "2.1rem", fontWeight: 800, color: "#1f2937", lineHeight: 1.2 }}>
          Tasks
        </Typography>
      </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.25, flexWrap: "wrap" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 260,
            maxWidth: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            height: 42,
            border: "1px solid #dfe3e6",
            borderRadius: "8px",
            background: "#ffffff",
            px: 1.4,
            boxSizing: "border-box",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              borderColor: "#f97316",
              boxShadow: "0 0 0 1px rgba(249,115,22,0.12)",
            },
          }}
        >
          <SearchOutlinedIcon sx={{ color: "#6b7280", fontSize: 22 }} />
          <Box
            component="input"
            placeholder="Search by ID or task name"
            sx={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "#111827",
              fontWeight: 500,
              padding: 0,
              "::placeholder": { color: "#6b7280", opacity: 1 },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#111827",
              transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
              "&:hover": {
                borderColor: "#f97316",
                boxShadow: "0 0 0 1px rgba(249,115,22,0.12)",
                transform: "translateY(-1px)",
              },
              "&:hover .MuiSvgIcon-root": {
                color: "#f97316",
              },
            }}
          >
            <FilterAltOutlinedIcon sx={{ fontSize: 22, color: "#374151" }} />
          </Box>

          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 42,
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#111827",
              fontWeight: 700,
              fontSize: 15,
              minWidth: 128,
              overflow: "hidden",
              transition: "box-shadow 0.2s ease, border-color 0.2s ease",
              "&:hover": {
                borderColor: "#f97316",
                boxShadow: "0 0 0 1px rgba(249,115,22,0.12)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: "100%",
                borderRight: "1px solid #dfe3e6",
                background: "#ffffff",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0.8 }}>
                <SwapVertOutlinedIcon sx={{ fontSize: 20, color: "#ff642d" }} />
              </Box>
            </Box>

            <Box component="span" sx={{ px: 1.1, color: "#111827", whiteSpace: "nowrap", lineHeight: 1 }}>Sort By</Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: "100%",
                borderLeft: "1px solid #dfe3e6",
                background: "#ffffff",
              }}
            >
              <ExpandMoreOutlinedIcon sx={{ fontSize: 18, color: "#f97316" }} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mb: 2.5 }}>
        {["In Progress", "Task with Work order", "Delayed", "Task open issue"].map((filter) => (
          <Box
            key={filter}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 34,
              border: "1px solid #dfe3e6",
              borderRadius: "8px",
              background: "#ffffff",
              px: 1.5,
              py: 0,
              color: "#111827",
              fontWeight: 600,
              fontSize: 12,
              overflow: "hidden",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                borderColor: "#f97316",
                boxShadow: "0 0 0 1px rgba(249,115,22,0.12)",
              },
            }}
          >
            <Box component="span" sx={{ px: 0.3, py: 0.55, display: "inline-flex", alignItems: "center" }}>
              {filter}
            </Box>
          </Box>
        ))}
        {["Schedule", "Status", "Category"].map((filter) => (
          <Box
            key={filter}
            component="button"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={filter === "Schedule" ? Boolean(scheduleAnchor) : filter === "Status" ? Boolean(statusAnchor) : Boolean(categoryAnchor)}
            onClick={filter === "Schedule" ? (event) => {
              setScheduleDraft(scheduleFilter);
              setScheduleAnchor(event.currentTarget);
            } : filter === "Status" ? (event) => {
              setStatusDraft(statusFilter);
              setStatusAnchor(event.currentTarget);
            } : (event) => {
              setCategoryDraft(categoryFilter);
              setCategoryAnchor(event.currentTarget);
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 34,
              border: "1px solid #dfe3e6",
              borderRadius: "8px",
              background: "#ffffff",
              px: 0,
              py: 0,
              color: "#111827",
              fontWeight: 600,
              fontSize: 12,
              overflow: "hidden",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              "&:hover": { borderColor: "#f97316", boxShadow: "0 0 0 1px rgba(249,115,22,0.12)" },
            }}
          >
            <Box component="span" sx={{ px: 1.2, py: 0.55, display: "inline-flex", alignItems: "center" }}>
              {filter}
              {filter === "Schedule" && scheduleFilter.length > 0 ? ` (${scheduleFilter.length})` : ""}
              {filter === "Status" && statusFilter.length > 0 ? ` (${statusFilter.length})` : ""}
              {filter === "Category" && categoryFilter.length > 0 ? ` (${categoryFilter.length})` : ""}
            </Box>
            <Box component="span" sx={{ width: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#111827", fontSize: 12, borderLeft: "1px solid #e5e7eb", height: "100%" }}>
              <ExpandMoreOutlinedIcon sx={{ fontSize: 16 }} />
            </Box>
          </Box>
        ))}
        <Popover
          open={Boolean(scheduleAnchor)}
          anchorEl={scheduleAnchor}
          onClose={() => setScheduleAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { className: "task-schedule-popover" } }}
        >
          <Box className="task-schedule-popover__options" role="group" aria-label="Schedule filters">
            {[
              { value: "today", label: "Today" },
              { value: "next7", label: "Next 7 Day" },
              { value: "next3", label: "Next 3 day" },
            ].map((option) => (
              <label className="task-schedule-option" key={option.value}>
                <Checkbox
                  checked={scheduleDraft.includes(option.value)}
                  onChange={(event) => setScheduleDraft((current) => event.target.checked
                    ? [...current, option.value]
                    : current.filter((value) => value !== option.value))}
                  icon={<span className="task-schedule-checkbox" />}
                  checkedIcon={<span className="task-schedule-checkbox task-schedule-checkbox--checked">✓</span>}
                  inputProps={{ "aria-label": option.label }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </Box>
          <Box className="task-schedule-popover__actions">
            <button type="button" className="task-schedule-clear" onClick={() => setScheduleDraft([])}>Clear All</button>
            <button type="button" className="task-schedule-apply" onClick={() => {
              setScheduleFilter(scheduleDraft);
              setScheduleAnchor(null);
            }}>Apply</button>
          </Box>
        </Popover>
        <Popover
          open={Boolean(statusAnchor)}
          anchorEl={statusAnchor}
          onClose={() => setStatusAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { className: "task-schedule-popover task-status-popover" } }}
        >
          <Box className="task-schedule-popover__options task-status-popover__options" role="group" aria-label="Task status filters">
            {["Not Started", "In Progress", "Completed"].map((option) => (
              <label className="task-schedule-option" key={option}>
                <Checkbox
                  checked={statusDraft.includes(option)}
                  onChange={(event) => setStatusDraft((current) => event.target.checked
                    ? [...current, option]
                    : current.filter((value) => value !== option))}
                  icon={<span className="task-schedule-checkbox" />}
                  checkedIcon={<span className="task-schedule-checkbox task-schedule-checkbox--checked">✓</span>}
                  inputProps={{ "aria-label": option }}
                />
                <span>{option}</span>
              </label>
            ))}
          </Box>
          <Box className="task-schedule-popover__actions task-status-popover__actions">
            <button type="button" className="task-schedule-clear" onClick={() => setStatusDraft([])}>Clear All</button>
            <button type="button" className="task-schedule-apply" onClick={() => {
              setStatusFilter(statusDraft);
              setStatusAnchor(null);
            }}>Apply</button>
          </Box>
        </Popover>
        <Popover
          open={Boolean(categoryAnchor)}
          anchorEl={categoryAnchor}
          onClose={() => setCategoryAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { className: "task-schedule-popover task-category-popover" } }}
        >
          <Box className="task-schedule-popover__options task-category-popover__options" role="group" aria-label="Task category filters">
            {["Ceiling", "Civil", "Electrical", "General"].map((option) => (
              <label className="task-schedule-option" key={option}>
                <Checkbox
                  checked={categoryDraft.includes(option)}
                  onChange={(event) => setCategoryDraft((current) => event.target.checked
                    ? [...current, option]
                    : current.filter((value) => value !== option))}
                  icon={<span className="task-schedule-checkbox" />}
                  checkedIcon={<span className="task-schedule-checkbox task-schedule-checkbox--checked">✓</span>}
                  inputProps={{ "aria-label": option }}
                />
                <span>{option}</span>
              </label>
            ))}
          </Box>
          <Box className="task-schedule-popover__actions task-category-popover__actions">
            <button type="button" className="task-schedule-clear" onClick={() => setCategoryDraft([])}>Clear All</button>
            <button type="button" className="task-schedule-apply" onClick={() => {
              setCategoryFilter(categoryDraft);
              setCategoryAnchor(null);
            }}>Apply</button>
          </Box>
        </Popover>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#111827", mb: 0.3 }}>
          {visibleTasks.length} {visibleTasks.length === 1 ? "Task" : "Tasks"}
        </Typography>

        {visibleTasks.length === 0 ? (
          <Typography sx={{ py: 3, color: "#6b7280", textAlign: "center" }}>No tasks match the selected status.</Typography>
        ) : visibleTasks.map((task, index) => (
          <Box
            key={task.id}
            component="button"
            type="button"
            onClick={() => setSelectedTask(task)}
            aria-label={`Open ${task.name} task progress`}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              minHeight: 76,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              px: 2,
              py: 1.3,
              boxSizing: "border-box",
              width: "100%",
              textAlign: "left",
              font: "inherit",
              cursor: "pointer",
              "&:hover": { borderColor: "#ff9b75", boxShadow: "0 2px 8px rgba(249, 115, 22, 0.08)" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.25, minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  borderRadius: "50%",
                  background: "#f2f4f7",
                  color: "#475467",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {index + 1}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase", mb: 0.2 }}>
                  {task.id}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                  {task.name}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, flexShrink: 0 }}>
              {task.status === "Completed" ? (
                <>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1.1,
                      py: 0.5,
                      borderRadius: "6px",
                      background: "#ebf9ef",
                      color: "#1f9d63",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    <Box component="span" sx={{ fontSize: 13 }}>✓</Box>
                    <Box component="span">Completed</Box>
                  </Box>

                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.4,
                      px: 1,
                      py: 0.5,
                      borderRadius: "6px",
                      background: "#ffe5e5",
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    <Box component="span" sx={{ fontSize: 13 }}>!</Box>
                    <Box component="span">2 Open issues</Box>
                  </Box>

                  <Box component="span" sx={{ color: "#4b5563", fontSize: 12, whiteSpace: "nowrap" }}>{task.issueRange}</Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 52,
                    px: 1,
                    py: 0.45,
                    borderRadius: "6px",
                    background: "#fef1d5",
                    color: "#b86b00",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {task.progress}%
                </Box>
              )}

              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#111827",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 400,
                    fontSize: 18,
                    lineHeight: 1,
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": {
                      borderColor: "#f97316",
                      boxShadow: "0 0 0 1px rgba(249,115,22,0.12)",
                    },
                  }}
                >
                  +
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Update</Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.25 }}>
        <Box
          component="button"
          type="button"
          aria-label="Add task"
          onClick={() => setShowCreateTask(true)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.1,
            border: 0,
            background: "transparent",
            color: "#ff642d",
            p: 0,
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <Box
            component="span"
            sx={{
              width: 45,
              height: 45,
              display: "grid",
              placeItems: "center",
              borderRadius: "11px",
              background: "linear-gradient(180deg, #ff7040 0%, #ff572b 100%)",
              boxShadow: "0 4px 10px rgba(255, 87, 43, 0.18)",
              transition: "transform 0.16s ease, box-shadow 0.16s ease",
              "button:hover &": { transform: "translateY(-1px)", boxShadow: "0 6px 13px rgba(255, 87, 43, 0.25)" },
            }}
          >
            <AddOutlinedIcon sx={{ fontSize: 22, color: "#ffffff" }} />
          </Box>
          <Box component="span">Add Task</Box>
        </Box>
      </Box>
    </Box>
  );

  const renderComingSoonSection = () => (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        p: { xs: 3, md: 4 },
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        textAlign: "center",
        minHeight: "220px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827", mb: 1 }}>
          This page will come soon
        </Typography>
        <Typography variant="body1" sx={{ color: "#6b7280" }}>
          We’re preparing this section for you.
        </Typography>
      </Box>
    </Box>
  );

  const handleCompleteProject = async () => {
    const confirm = window.confirm(
      "Are you sure? This will free all workers and lock attendance."
    );
    if (!confirm) return;

    try {
      await axiosInstance.post(
        `/projects/${id}/complete`
      );

      toast.success("Project completed");
      setProject(prev => ({ ...prev, status: "Completed" }));

    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleInventoryChange = (event) => {
    setInventoryForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleAddInventory = async () => {
    try {
      await axiosInstance.post(`/inventory/${id}`, inventoryForm);
      toast.success("Inventory added");
      setOpenInventoryModal(false);
      setInventoryForm({
        name: "",
        unit: "",
        supplierName: "",
        companyName: "",
        quantity: "",
        pricePerUnit: "",
        purchaseDate: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Add inventory error:", error);
      toast.error(error.response?.data?.message || "Failed to add inventory");
    }
  };


  const searchSiteMembers = async (searchValue) => {
    setMemberSearch(searchValue);
    if (!searchValue.trim()) {
      setSiteMembers([]);
      return;
    }

    setMemberSearchLoading(true);
    try {
      const response = await axiosInstance.get("/site-members", {
        params: { search: searchValue.trim() },
      });
      const members = Array.isArray(response.data?.members)
        ? response.data.members
        : [];
      setSiteMembers(members.filter((member) => member.role === "Site Engineer"));
    } catch (error) {
      console.error("Search site members error:", error);
      toast.error(error.response?.data?.message || "Unable to search site members.");
      setSiteMembers([]);
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const inviteSiteMember = async (event) => {
    event.preventDefault();

    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();

    if (!name || !email || !inviteRole) {
      toast.error("Name, email, and role are required.");
      return;
    }

    setSendingInvite(true);
    try {
      await axiosInstance.post("/site-members/invite", {
        name,
        email,
        role: inviteRole,
      });

      toast.success("Invitation sent. The member can be assigned after activating their account.");
      setOpenInviteDialog(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("Site Engineer");
      setMemberSearch("");
      setSiteMembers([]);
    } catch (error) {
      console.error("Invite site member error:", error);
      toast.error(error.response?.data?.message || "Unable to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  const assignSiteEngineer = async (member) => {
    if (!member?._id) return;

    if (assignedSiteEngineerIds.has(member._id)) {
      toast.info("This Site Engineer is already assigned to the project.");
      return;
    }

    setAssigningMemberId(member._id);

    try {
      await axiosInstance.post(`/site-members/projects/${id}/assign`, {
        userId: member._id,
      });
      setProject((previous) => ({
        ...previous,
        siteEngineers: [...getAssignedSiteEngineers(previous), member],
      }));
      await fetchProject();
      setSiteMembers([]);
      setMemberSearch("");
      toast.success("Site Engineer assigned successfully.");
    } catch (error) {
      console.error("Assign Site Engineer error:", error);
      toast.error(error.response?.data?.message || "Could not assign Site Engineer.");
    } finally {
      setAssigningMemberId("");
    }
  };

  const fetchProject = async () => {
    try {
      const res = await axiosInstance.get(`/projects/${id}`);
      console.log(res);

      if (res.status === 200) {
        setProject(res.data.project);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching project");
      setLoading(false);
    }
  };

  // handle open edit modal function
  const handleOpenEdit = () => {
    setNewTitle(project?.title || "");
    setOpenEditModal(true);
  }

  // update title function
  const updateProjectTitle = async () => {
    try {
      const response = await axiosInstance.patch(
        `/projects/${id}/title`,
        {
          title: newTitle
        }
      );
      setProject((prev) => ({
        ...prev,
        title: newTitle
      }))
      setOpenEditModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Unable to edit the title.");
    }
  }

  useEffect(() => {
    fetchProject();

    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket']
    });
    socketRef.current.emit("join", { projectId: id });

    const handleNewReport = (data) => {
      setProject((prevData) => {
        if (!prevData) return prevData;
        const reports = Array.isArray(prevData.reports) ? prevData.reports : [];
        if (reports.some((report) => report._id === data.newReport._id)) {
          return prevData;
        }
        return {
          ...prevData,
          reports: [
            ...reports,
            {
              ...data.newReport,
              siteEngineerId: {
                ...data.newReport.siteEngineerId,
                name: data.siteEngName
              }
            }
          ]
        };
      });
      toast.info(`New report received: ${data.projectTitle}`, {
        onClick: () => {
          if (data.newReport?._id) {
            navigate(isSiteEngineer
              ? `/site-engineer/projects/${id}/report`
              : `/founder/view-report/${data.newReport._id}`);
          }
        }
      });
    };
    const handleMiscNew = (data) => {
      toast.info(`New misc expense added: ${data.itemName}`);
      fetchProject();
    };
    const handleReportReviewed = (data) => {
      setProject((previous) => ({
        ...previous,
        reports: (previous?.reports || []).map((report) =>
          report._id?.toString() === data.reportId?.toString()
            ? {
                ...report,
                contractorStatus: data.contractorStatus,
                contractorComment: data.contractorComment,
              }
            : report,
        ),
      }));
      toast.info("Report has Been Reviewed");
    };
    const handleProjectCompleted = () => {
      toast.info("Project has been completed");
      setProject((previous) => ({ ...previous, status: "Completed" }));
      if (isSiteEngineer) navigate(projectListPath);
    };
    const handleProjectDeleted = () => {
      toast.info("Project has been deleted");
      navigate(projectListPath);
    };
    const handleTitleUpdated = (data) => {
      setProject((previous) => ({ ...previous, title: data.title }));
      toast.info("Title Updated");
    };
    const handleMiscUpdated = (data) => {
      toast.info(`Expense ${data.itemName} was ${data.status}`);
    };

    socketRef.current.on("report:new", handleNewReport);
    socketRef.current.on("misc:new", handleMiscNew);
    socketRef.current.on("report:reviewed", handleReportReviewed);
    socketRef.current.on("project:completed", handleProjectCompleted);
    socketRef.current.on("project:deleted", handleProjectDeleted);
    socketRef.current.on("project:titleUpdated", handleTitleUpdated);
    socketRef.current.on("misc:updated", handleMiscUpdated);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("report:new", handleNewReport);
        socketRef.current.off("misc:new", handleMiscNew);
        socketRef.current.off("report:reviewed", handleReportReviewed);
        socketRef.current.off("project:completed", handleProjectCompleted);
        socketRef.current.off("project:deleted", handleProjectDeleted);
        socketRef.current.off("project:titleUpdated", handleTitleUpdated);
        socketRef.current.off("misc:updated", handleMiscUpdated);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id, isSiteEngineer, navigate, projectListPath]);

  console.log(project)

  if (loading) return <FullScreenLoader />;

  // Safe checks for when project is not loaded due to error
  if (!project) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Box className="container py-5">
          <Typography variant="h6" color="error">
            {t("project.unable_load")}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      className="project-overview-page"
      sx={{
        height: "calc(100dvh - var(--dashboard-header-height))",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9fafb",
      }}
    >

      <Box className="project-overview-main">
        <Box className="project-overview-rail-wrap">
          <Box className="project-overview-rail" aria-label="Project action navigation">
            {actionTabs.map(({ label, icon: Icon }) => (
              <Box
                key={label}
                component="button"
                type="button"
                className={`project-overview-rail-item${activeTab === label ? " active" : ""}`}
                onClick={() => setActiveTab(label)}
              >
                {Icon && <Icon className="project-overview-rail-icon" />}
                <span>{label}</span>
              </Box>
            ))}
            <ChatModal
              projectId={id}
              showIcon
              buttonClassName="project-overview-rail-chat"
              buttonStyle={{
                width: "auto",
                minWidth: 0,
                height: 30,
                padding: "0 18px",
              }}
              buttonSx={{
                borderRadius: "5px",
                background: "linear-gradient(180deg, #ff9d2b 0%, #f97316 100%)",
                color: "#fff",
                boxShadow: "0 8px 18px rgba(249, 115, 22, 0.25)",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                "&:hover": {
                  background: "linear-gradient(180deg, #ff9d2b 0%, #f97316 100%)",
                  boxShadow: "0 8px 18px rgba(249, 115, 22, 0.25)",
                },
              }}
            />
          </Box>
        </Box>

        <Box className="project-overview-content">
        {activeTab === "Overview" && (
          <>
            {/* HEADER */}
            <Box className="project-overview-heading" sx={{ mb: 3 }}>
              <Typography variant="h1" className="project-overview-title">
                {overviewTitleSplit > 0 ? <>{overviewTitle.slice(0, overviewTitleSplit)} <span>{overviewTitle.slice(overviewTitleSplit + 1)}</span></> : <span>{overviewTitle}</span>}
              </Typography>
              <Typography variant="body1" className="project-overview-subtitle">
                {t("project.project_overview_desc")}
              </Typography>
            </Box>

            {/* MANAGE SITE MEMBERS */}
            {!isSiteEngineer && <Box
              sx={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                p: { xs: 2.5, md: 3 },
                mb: 4,
                boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Manage Site Members
              </Typography>
              <Typography variant="body2" sx={{ color: "#667085", mb: 2 }}>
                Search for an active Site Engineer in your organization and assign them to this project. New members must activate their account before they can be assigned.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Site Engineers"
                  placeholder="Enter name or email"
                  value={memberSearch}
                  onChange={(event) => searchSiteMembers(event.target.value)}
                  inputProps={{ maxLength: 100 }}
                />
                <Button
                  variant="outlined"
                  onClick={() => setOpenInviteDialog(true)}
                  sx={{ whiteSpace: "nowrap", minWidth: { sm: "190px" } }}
                >
                  + Invite New Member
                </Button>
              </Box>

              {memberSearchLoading && <CircularProgress size={24} sx={{ mb: 1 }} />}

              {memberSearch.trim() && !memberSearchLoading && (
                <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
                  {siteMembers.length > 0 ? siteMembers.map((member) => (
                    <Box
                      key={member._id}
                      sx={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 2,
                        p: 1.5,
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { sm: "center" },
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{member.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{member.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{member.role}</Typography>
                      </Box>
                      {!assignedSiteEngineerIds.has(member._id) && (
                        <Button
                          variant="contained"
                          disabled={Boolean(assigningMemberId)}
                          onClick={() => assignSiteEngineer(member)}
                        >
                          {assigningMemberId === member._id ? "Assigning..." : "Assign"}
                        </Button>
                      )}
                    </Box>
                  )) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      No active Site Engineers found for this search.
                    </Typography>
                  )}
                </Box>
              )}

              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, backgroundColor: "#f8fafc" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Currently assigned site engineers
                </Typography>
                {assignedSiteEngineers.length > 0 ? (
                  <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2.5 }}>
                    {assignedSiteEngineers.map((engineer, index) => (
                      <li key={typeof engineer === "object" ? engineer?._id || index : engineer}>
                        <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
                          {typeof engineer === "object" ? engineer?.name || "Site Engineer" : "Site Engineer"}
                        </Typography>
                        {typeof engineer === "object" && engineer?.email && (
                          <>
                            {" — "}
                            <Typography
                              component="a"
                              variant="body2"
                              href={`mailto:${engineer.email}`}
                              sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                            >
                              {engineer.email}
                            </Typography>
                          </>
                        )}
                      </li>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    No site engineers assigned yet.
                  </Typography>
                )}
              </Box>
            </Box>}

            {/* PROJECT INFO CARD */}
            <Box
              className="project-overview-grid"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                gap: 4,
                mb: 5,
              }}
            >
              {/* LEFT: DETAILS */}
              <Box
                className="project-details-card"
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  p: 4,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                }}
              >
                <Box className="project-details-title-row" display="flex" alignItems="center" gap={1}>
                  <Box className="project-details-building"><OverviewBuildingIcon /></Box>
                  <Box className="project-details-title-copy">
                    <div className="project-name-line">
                      <Typography variant="h4" className="project-details-title">{project.title}</Typography>
                      {!isSiteEngineer && <EditIcon
                        className="project-title-edit"
                        sx={{
                          cursor: "pointer",
                          fontSize: 22,
                          color: "#666"
                        }}
                        onClick={handleOpenEdit}
                      />}
                    </div>
                    <Typography variant="body2" className="project-details-description">{project.description}</Typography>
                  </Box>
                </Box>
                <Box className="project-metadata-list">
                  <div className="project-metadata-row"><OverviewFlagIcon /><strong>{t("project.status")}:</strong>
                    <StatusChips
                      label={project.status || t("project.ongoing")}
                      status={project.status || "ongoing"}
                      style={{ justifySelf: "start", alignSelf: "center" }}
                    />
                  </div>
                  <div className="project-metadata-row"><CalendarMonthOutlinedIcon /><strong>{t("project.start_date")}:</strong><span>{project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "—"}</span></div>
                  <div className="project-metadata-row"><EventAvailableOutlinedIcon /><strong>{t("project.end_date")}:</strong><span>{project.endDate ? new Date(project.endDate).toLocaleDateString("en-GB") : "—"}</span></div>
                  <div className="project-metadata-row"><PersonOutlineIcon /><strong>{t("project.contractor")}:</strong><span>{project.contractor?.name || "N/A"}</span></div>
                  <div className="project-metadata-row">
                    <SiteEngineerIcon />
                    <strong>{t("project.site_engineers")}:</strong>
                    <Box component="span" sx={{ display: "grid", gap: 0.5, py: 1 }}>
                      {assignedSiteEngineers.length > 0 ? assignedSiteEngineers.map((engineer, index) => (
                        <span key={typeof engineer === "object" ? engineer?._id || index : engineer}>
                          {typeof engineer === "object" ? engineer?.name || "Site Engineer" : "Site Engineer"}
                        </span>
                      )) : <span>N/A</span>}
                    </Box>
                  </div>
                </Box>
              </Box>

              {/* RIGHT: ACTIONS */}
              <Box
                className="project-actions-card"
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  p: 4,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  height: "fit-content",
                }}
              >
                <Typography variant="h4" className="project-actions-title">
                  {t("project.actions")}
                </Typography>

                {!isSiteEngineer && <Button
                  className="overview-action primary-action"
                  startIcon={<VisibilityOutlinedIcon />}
                  variant="contained"
                  onClick={() => {
                    navigate(`/founder/projects/${id}/attendance`);
                  }}
                  sx={{
                    position: "relative",
                    opacity: 1,
                    backgroundColor: "primary.main",
                    color: "#000",
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "white",
                    },
                  }}
                >
                  {t("project.view_attendance")}

                  {false && (
                    <LockIcon
                      fontSize="small"
                      sx={{
                        ml: 1,
                        fontSize: 18,
                        color: "#ff9800"
                      }}
                    />
                  )}
                </Button>}

                {!isSiteEngineer && <Button
                  className="overview-action"
                  startIcon={<Groups2OutlinedIcon />}
                  variant="outlined"
                  onClick={() => {
                    setOpenWageModal(true)
                  }}
                  sx={{
                    position: "relative",
                    opacity: 1,
                    color: "#F97316",
                    borderColor: "#F97316",
                    backgroundColor: "#fff",
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: "#e9650e",
                      backgroundColor: "#fff7f2",
                      color: "#F97316",
                    },
                  }}
                >
                  View Worker Wages
                  {false && (
                    <LockIcon
                      fontSize="small"
                      sx={{
                        ml: 1,
                        fontSize: 18,
                        color: "#ff9800"
                      }}
                    />
                  )}
                </Button>}

                {isSiteEngineer ? (
                  project.status !== "Completed" ? (
                    <>
                      <Button
                        className="overview-action primary-action"
                        component={Link}
                        to={`/site-engineer/projects/${id}/report`}
                        variant="contained"
                      >
                        {t("project.submit_report_btn")}
                      </Button>
                      <Button
                        className="overview-action"
                        component={Link}
                        to={`/site-engineer/projects/${id}/attendance`}
                        variant="outlined"
                      >
                        {t("project.mark_attendance")}
                      </Button>
                      <Button
                        className="overview-action"
                        component={Link}
                        to={`/site-engineer/projects/${id}/inventory`}
                        variant="outlined"
                      >
                        {t("project.log_inventory")}
                      </Button>
                      <Button
                        className="overview-action"
                        variant="outlined"
                        onClick={() => setOpenInventoryModal(true)}
                      >
                        ADD INVENTORY
                      </Button>
                      <Button
                        className="overview-action"
                        variant="outlined"
                        onClick={() => setOpenMiscModal(true)}
                      >
                        Add Misc Expense
                      </Button>
                    </>
                  ) : (
                    <Typography color="error">
                      {t("project.project_completed_locked")}
                    </Typography>
                  )
                ) : (
                  <>
                    {project.status === "Ongoing" && (
                      <>
                        <Button
                          className="overview-action"
                          startIcon={<Groups2OutlinedIcon />}
                          variant="contained"
                          color="secondary"
                          onClick={() => navigate(`/founder/projects/${id}/assign-workers`)}
                        >
                          {t("project.assign_workers")}
                        </Button>
                        <Button
                          className="overview-action"
                          variant="contained"
                          color="error"
                          onClick={handleCompleteProject}
                        >
                          {t("project.mark_completed")}
                        </Button>
                      </>
                    )}
                    <Button
                      className="overview-action"
                      startIcon={<InventoryCubeIcon />}
                      variant="outlined"
                      onClick={() => navigate(`/founder/projects/${id}/inventory`)}
                    >
                      {t("project.view_inventory")}
                    </Button>
                    <Button
                      className="overview-action misc-action"
                      startIcon={<MonetizationOnOutlinedIcon />}
                      variant="contained"
                      color="warning"
                      onClick={() => setOpenMiscModal(true)}
                    >
                      View Misc Expenses
                    </Button>
                  </>
                )}

                {project.status === "Completed" && (
                  <Typography className="project-locked-note" color="error" variant="body2">
                    {t("project.project_locked")}
                  </Typography>
                )}

              </Box>
            </Box>
          </>
        )}

        {/* REPORTS SECTION */}

        {activeTab === "Task" ? (
          showCreateTask ? (
            <CreateTaskForm
              siteEngineers={assignedSiteEngineers}
              onBack={() => setShowCreateTask(false)}
              onDone={(task) => {
                setCreatedTasks((current) => [{
                  ...task,
                  id: `TSK${Date.now().toString().slice(-6)}`,
                  status: "Not Started",
                }, ...current]);
                setShowCreateTask(false);
              }}
            />
          ) : selectedTask ? (
            <TaskProgressDetails
              task={selectedTask}
              projectId={id}
              onBack={() => setSelectedTask(null)}
              onUpdateProgress={(progress) => {
                const status = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started";
                setTaskOverrides((current) => ({ ...current, [selectedTask.id]: { progress, status } }));
                setSelectedTask((current) => ({ ...current, progress, status }));
              }}
            />
          ) : renderTasksSection()
        ) : activeTab === "Report" ? (
          <Box className="project-reports-panel">
            <Reports
              projectId={id}
              projectTitle={project.title}
              onClose={() => setActiveTab("Overview")}
              onProjectSelect={(selectedProject) => {
                navigate(
                  isSiteEngineer
                    ? `/site-engineer/projects/${selectedProject._id}`
                    : `/founder/project/${selectedProject._id}`,
                );
              }}
            />
          </Box>
        ) : activeTab !== "Overview" ? (
          renderComingSoonSection()
        ) : null}
        </Box>

      </Box>

      {!isSiteEngineer && <WageModal
        open={openWageModal}
        onClose={() => setOpenWageModal(false)}
        projectId={id}
      />}

      {!isSiteEngineer ? <MiscExpenseModal
        open={openMiscModal}
        onClose={() => setOpenMiscModal(false)}
        project={project}
        refreshProject={fetchProject}
      /> : (
        <AddMiscExpenseModal
          open={openMiscModal}
          onClose={() => setOpenMiscModal(false)}
          projectId={id}
          onSuccess={fetchProject}
        />
      )}

      {isSiteEngineer && (
        <Dialog
          open={openInventoryModal}
          onClose={() => setOpenInventoryModal(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Add Inventory</DialogTitle>
          <DialogContent>
            <TextField fullWidth margin="normal" label="Material Name" name="name" value={inventoryForm.name} onChange={handleInventoryChange} />
            <TextField fullWidth margin="normal" label="Unit" name="unit" value={inventoryForm.unit} onChange={handleInventoryChange} />
            <TextField fullWidth margin="normal" label="Supplier Name" name="supplierName" value={inventoryForm.supplierName} onChange={handleInventoryChange} />
            <TextField fullWidth margin="normal" label="Company Name" name="companyName" value={inventoryForm.companyName} onChange={handleInventoryChange} />
            <TextField fullWidth margin="normal" type="number" label="Quantity" name="quantity" value={inventoryForm.quantity} onChange={handleInventoryChange} />
            <TextField fullWidth margin="normal" type="number" label="Price Per Unit" name="pricePerUnit" value={inventoryForm.pricePerUnit} onChange={handleInventoryChange} />
            <TextField fullWidth margin="normal" type="date" label="Purchase Date" name="purchaseDate" value={inventoryForm.purchaseDate} onChange={handleInventoryChange} InputLabelProps={{ shrink: true }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenInventoryModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddInventory}>Add</Button>
          </DialogActions>
        </Dialog>
      )}

      {!isSiteEngineer && <Dialog
        open={openInviteDialog}
        onClose={() => {
          if (!sendingInvite) setOpenInviteDialog(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Invite New Site Member</DialogTitle>
        <Box component="form" onSubmit={inviteSiteMember}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              An activation email will be sent. This member will become selectable for project assignment after activating their account.
            </Typography>
            <TextField
              fullWidth
              required
              margin="normal"
              label="Full name"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              fullWidth
              required
              margin="normal"
              type="email"
              label="Email address"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              inputProps={{ maxLength: 254 }}
            />
            <TextField
              fullWidth
              required
              select
              margin="normal"
              label="Role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <MenuItem value="Site Engineer">Site Engineer</MenuItem>
              <MenuItem value="Site Supervisor">Site Supervisor</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpenInviteDialog(false)}
              disabled={sendingInvite}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={sendingInvite}>
              {sendingInvite ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>}

      {!isSiteEngineer && <Dialog
        className="project-title-dialog"
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
      >

        <DialogTitle>
          Edit Project Title
        </DialogTitle>

        <DialogContent>

          <TextField
            fullWidth
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mt: 1 }}
          />

        </DialogContent>

        <DialogActions>

          <Button
            onClick={() => setOpenEditModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={updateProjectTitle}
          >
            Update
          </Button>

        </DialogActions>

      </Dialog>}

    </Box>
  );

}
