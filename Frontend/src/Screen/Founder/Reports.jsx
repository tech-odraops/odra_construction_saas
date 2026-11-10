import { useState } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Menu, MenuItem } from "@mui/material";
import { toast } from "react-toastify";
import Button from "../../Components/atoms/Button/Button";
import RadioButton from "../../Components/atoms/RadioButton/RadioButton";
import axiosInstance from "../../utils/axiosInstance";
import reportsIllustration from "../../assets/reports-illustration.png";
import "./Reports.css";

const reportTypes = [
  {
    value: "detailed",
    title: "Detailed Report",
    description: "Shows day-wise logs—useful for detailed tracking and records.",
  },
  {
    value: "summary",
    title: "Summary Report",
    description: "Shows key summaries—great for quick updates and sharing.",
  },
];

const durationOptions = [
  { value: "today", label: "Today", days: 0 },
  { value: "7-days", label: "7 days", days: 6 },
  { value: "15-days", label: "15 days", days: 14 },
  { value: "specific", label: "Specific" },
];

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return {
    from: getLocalDateString(from),
    to: getLocalDateString(to),
  };
}

export default function Reports({ projectId, projectTitle, onClose, onProjectSelect }) {
  const [reportType, setReportType] = useState("detailed");
  const [duration, setDuration] = useState("today");
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsLoadError, setProjectsLoadError] = useState("");
  const initialRange = getDateRange(0);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [reportParts, setReportParts] = useState({
    taskUpdate: true,
    photos: true,
    issues: true,
    workDown: true,
    inventory: true,
  });
  const [expandedParts, setExpandedParts] = useState({
    issues: false,
    workDown: false,
  });
  const [photos, setPhotos] = useState([]);
  const [issues, setIssues] = useState("");
  const [workDown, setWorkDown] = useState("");

  const handleDurationChange = (nextDuration) => {
    setDuration(nextDuration);
    setSubmissionMessage("");
    const option = durationOptions.find(({ value }) => value === nextDuration);
    if (option?.days !== undefined) {
      const range = getDateRange(option.days);
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmissionMessage("Report generation is not connected yet. Your selections have not been submitted.");
  };

  const toggleReportPart = (part) => {
    setReportParts((current) => ({ ...current, [part]: !current[part] }));
    setSubmissionMessage("");
  };

  const toggleExpandedPart = (part) => {
    setExpandedParts((current) => ({ ...current, [part]: !current[part] }));
  };

  const invalidDateRange = fromDate && toDate && fromDate > toDate;
  const canCreateReport =
    Boolean(projectId) &&
    Boolean(fromDate) &&
    Boolean(toDate) &&
    !invalidDateRange;

  const handleProjectMenuOpen = async (event) => {
    setProjectMenuAnchor(event.currentTarget);
    if (projects.length || projectsLoading) return;

    setProjectsLoading(true);
    setProjectsLoadError("");
    try {
      const response = await axiosInstance.get("/projects");
      if (!Array.isArray(response.data.projects)) {
        throw new Error("Projects response did not contain a project list.");
      }
      setProjects(response.data.projects);
    } catch (error) {
      console.error("Could not load projects for report selection:", error);
      setProjectsLoadError("Unable to load projects.");
      toast.error("Unable to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectSelect = (selectedProject) => {
    setProjectMenuAnchor(null);
    if (selectedProject._id !== projectId) {
      onProjectSelect(selectedProject);
    }
  };

  return (
    <main className="reports-page reports-page--embedded">
      <div className="report-page-heading">
        <div className="report-project-picker">
          <div className="report-card-title-row">
            <button
              className="report-close-button"
              type="button"
              aria-label="Close report form"
              title="Close"
              onClick={onClose}
            >
              <CloseOutlinedIcon />
            </button>
            <h1>Create Report</h1>
          </div>
          <button
            className="report-project-name"
            type="button"
            aria-haspopup="menu"
            aria-expanded={Boolean(projectMenuAnchor)}
            onClick={handleProjectMenuOpen}
          >
            <span>{projectTitle}</span>
            <KeyboardArrowDownIcon aria-hidden="true" />
          </button>
          <Menu
            anchorEl={projectMenuAnchor}
            open={Boolean(projectMenuAnchor)}
            onClose={() => setProjectMenuAnchor(null)}
            slotProps={{ list: { "aria-label": "Select project" } }}
          >
            {projectsLoading ? (
              <MenuItem disabled>Loading projects...</MenuItem>
            ) : projectsLoadError ? (
              <MenuItem disabled>{projectsLoadError}</MenuItem>
            ) : projects.length ? (
              projects.map((availableProject) => (
                <MenuItem
                  key={availableProject._id}
                  selected={availableProject._id === projectId}
                  onClick={() => handleProjectSelect(availableProject)}
                >
                  {availableProject.title}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No projects available</MenuItem>
            )}
          </Menu>
        </div>
      </div>

      <form className="report-create-card" onSubmit={handleSubmit}>
        <div className="report-form-layout">
          <div className="report-form-scroll">
            <div className="report-options-column">
              <fieldset className="report-type-fieldset">
              <legend>Select report type</legend>
              <div className="report-type-options">
                {reportTypes.map((option) => (
                  <label
                    className={`report-type-option${reportType === option.value ? " is-selected" : ""}`}
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="report-type"
                      value={option.value}
                      checked={reportType === option.value}
                      onChange={() => {
                        setReportType(option.value);
                        setSubmissionMessage("");
                      }}
                    />
                    <span className="report-type-icon" aria-hidden="true">
                      {option.value === "detailed" ? (
                        <DescriptionOutlinedIcon />
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <path d="M4 19V9m5 10V5m5 14v-7m5 7V3M2 21h20" />
                          <path d="m3 7 6-4 5 5 7-6" />
                        </svg>
                      )}
                    </span>
                    <span className="report-type-copy">
                      <span className="report-type-title">{option.title}</span>
                      <span className="report-type-description">{option.description}</span>
                    </span>
                    <span className="report-type-indicator" aria-hidden="true" />
                  </label>
                ))}
              </div>
              </fieldset>

              <fieldset className="report-duration-fieldset">
              <legend>Select duration</legend>
              <div className="report-duration-options">
                {durationOptions.map((option) => (
                  <RadioButton
                    key={option.value}
                    size="md"
                    name="report-duration"
                    value={option.value}
                    checked={duration === option.value}
                    onChange={() => handleDurationChange(option.value)}
                    label={option.label}
                  />
                ))}
              </div>

              <div className="report-date-fields">
                <label className="report-date-field">
                  <span>From</span>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(event) => {
                      setDuration("specific");
                      setFromDate(event.target.value);
                      setSubmissionMessage("");
                    }}
                    aria-label="From date"
                  />
                </label>
                <label className="report-date-field">
                  <span>To</span>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(event) => {
                      setDuration("specific");
                      setToDate(event.target.value);
                      setSubmissionMessage("");
                    }}
                    aria-label="To date"
                  />
                </label>
              </div>
              {invalidDateRange && (
                <p className="report-date-error" role="alert">
                  The end date must be on or after the start date.
                </p>
              )}
              </fieldset>

              <section className="report-parts-section" aria-labelledby="report-parts-title">
              <div className="report-parts-heading">
                <h2 id="report-parts-title">Parts in the Report</h2>
                <p>Select the information you want to include in your report</p>
              </div>

              <div className="report-parts-list">
                <div className="report-part-card">
                  <input
                    className="report-part-checkbox"
                    id="report-part-task-update"
                    type="checkbox"
                    checked={reportParts.taskUpdate}
                    onChange={() => toggleReportPart("taskUpdate")}
                  />
                  <label className="report-part-content" htmlFor="report-part-task-update">
                    <span className="report-part-icon"><TaskAltOutlinedIcon /></span>
                    <span className="report-part-copy">
                      <span className="report-part-title">Task Update</span>
                      <span className="report-part-description">Include latest task progress and updates</span>
                    </span>
                  </label>
                </div>

                <div className="report-part-card">
                  <input
                    className="report-part-checkbox"
                    id="report-part-photos"
                    type="checkbox"
                    checked={reportParts.photos}
                    onChange={() => toggleReportPart("photos")}
                  />
                  <label className="report-part-content" htmlFor="report-part-photos">
                    <span className="report-part-icon"><ImageOutlinedIcon /></span>
                    <span className="report-part-copy">
                      <span className="report-part-title">Photos</span>
                      <span className="report-part-description">
                        {photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected` : "Add site photos to your report"}
                      </span>
                    </span>
                  </label>
                  <label className="report-part-action report-photo-action">
                    <ImageOutlinedIcon />
                    <span>Add Photos</span>
                    <KeyboardArrowDownIcon />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        setPhotos(Array.from(event.target.files || []));
                        setSubmissionMessage("");
                      }}
                      aria-label="Add site photos"
                    />
                  </label>
                </div>

                <div className={`report-part-card${expandedParts.issues ? " is-expanded" : ""}`}>
                  <input
                    className="report-part-checkbox"
                    id="report-part-issues"
                    type="checkbox"
                    checked={reportParts.issues}
                    onChange={() => toggleReportPart("issues")}
                  />
                  <label className="report-part-content" htmlFor="report-part-issues">
                    <span className="report-part-icon"><WarningAmberOutlinedIcon /></span>
                    <span className="report-part-copy">
                      <span className="report-part-title">Issues</span>
                      <span className="report-part-description">Add and track site issues</span>
                    </span>
                  </label>
                  <button
                    className="report-part-expand"
                    type="button"
                    aria-label={expandedParts.issues ? "Hide issues details" : "Add issues details"}
                    aria-expanded={expandedParts.issues}
                    onClick={() => toggleExpandedPart("issues")}
                  >
                    {expandedParts.issues ? <KeyboardArrowDownIcon /> : <AddIcon />}
                  </button>
                  {expandedParts.issues && (
                    <textarea
                      className="report-part-details"
                      value={issues}
                      onChange={(event) => setIssues(event.target.value)}
                      placeholder="Describe issues found on site…"
                      aria-label="Issues details"
                      rows={3}
                    />
                  )}
                </div>

                <div className={`report-part-card${expandedParts.workDown ? " is-expanded" : ""}`}>
                  <input
                    className="report-part-checkbox"
                    id="report-part-work-down"
                    type="checkbox"
                    checked={reportParts.workDown}
                    onChange={() => toggleReportPart("workDown")}
                  />
                  <label className="report-part-content" htmlFor="report-part-work-down">
                    <span className="report-part-icon"><BarChartOutlinedIcon /></span>
                    <span className="report-part-copy">
                      <span className="report-part-title">Work Down</span>
                      <span className="report-part-description">Include work completed / work down details</span>
                    </span>
                  </label>
                  <button
                    className="report-part-expand"
                    type="button"
                    aria-label={expandedParts.workDown ? "Hide work down details" : "Add work down details"}
                    aria-expanded={expandedParts.workDown}
                    onClick={() => toggleExpandedPart("workDown")}
                  >
                    {expandedParts.workDown ? <KeyboardArrowDownIcon /> : <AddIcon />}
                  </button>
                  {expandedParts.workDown && (
                    <textarea
                      className="report-part-details"
                      value={workDown}
                      onChange={(event) => setWorkDown(event.target.value)}
                      placeholder="Describe completed work and work remaining…"
                      aria-label="Work down details"
                      rows={3}
                    />
                  )}
                </div>

                <div className="report-part-card">
                  <input
                    className="report-part-checkbox"
                    id="report-part-inventory"
                    type="checkbox"
                    checked={reportParts.inventory}
                    onChange={() => toggleReportPart("inventory")}
                  />
                  <label className="report-part-content" htmlFor="report-part-inventory">
                    <span className="report-part-icon"><Inventory2OutlinedIcon /></span>
                    <span className="report-part-copy">
                      <span className="report-part-title">Inventory</span>
                      <span className="report-part-description">Include material inventory details</span>
                    </span>
                  </label>
                </div>
              </div>
              </section>
            </div>
          </div>

          <aside className="report-sticky-panel">
            <div className="report-illustration-wrap">
              <img
                className="reports-illustration"
                src={reportsIllustration}
                alt="Building under construction with cranes"
              />
            </div>
          </aside>
        </div>
        <Button
              className="report-create-button"
              type="submit"
              variant="contained"
              fullWidth
              disabled={!canCreateReport}
              startIcon={<DescriptionOutlinedIcon />}
            >
          Create Report
        </Button>
        {submissionMessage && (
          <p className="report-submit-message" role="status">
            {submissionMessage}
          </p>
        )}
      </form>
    </main>
  );
}
