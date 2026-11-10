import { useEffect, useRef, useState } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AddIcon from "@mui/icons-material/Add";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Dialog, DialogActions, DialogContent } from "@mui/material";
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

export default function Reports({ projectId, projectTitle, onClose }) {
  const [reportType, setReportType] = useState("detailed");
  const [duration, setDuration] = useState("today");
  const initialRange = getDateRange(0);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [activeEntry, setActiveEntry] = useState(null);
  const [entryDraft, setEntryDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [reportParts, setReportParts] = useState({
    taskUpdate: true,
    photos: true,
    issues: true,
    workDown: true,
    inventory: true,
  });
  const [photos, setPhotos] = useState([]);
  const [issues, setIssues] = useState("");
  const [workDown, setWorkDown] = useState("");

  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const entryConfig = {
    issues: {
      title: "Issue",
      section: "Issues",
      placeholder: "Mention any issues or blockers...",
      submitLabel: "Submit Issue",
    },
    workDown: {
      title: "Work Down",
      section: "Work Down",
      placeholder: "Describe completed work and work remaining...",
      submitLabel: "Submit Work Down",
    },
  };
  const reportDate = toDate
    ? new Date(`${toDate}T00:00:00`).toLocaleDateString("en-GB")
    : "";

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

  const openEntryDialog = (part) => {
    setEntryDraft(part === "issues" ? issues : workDown);
    setActiveEntry(part);
  };

  const closeEntryDialog = () => {
    if (isRecording) return;
    setActiveEntry(null);
    setEntryDraft("");
  };

  const saveEntry = () => {
    if (activeEntry === "issues") setIssues(entryDraft);
    if (activeEntry === "workDown") setWorkDown(entryDraft);
    setSubmissionMessage("");
    setActiveEntry(null);
    setEntryDraft("");
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Audio recording is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (!audioBlob.size) return;

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        try {
          const response = await axiosInstance.post("/reports/voice-to-text", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const transcription = activeEntry === "issues"
            ? response.data?.structuredData?.issuesFound
            : response.data?.structuredData?.workDone;
          if (typeof transcription !== "string" || !transcription.trim()) {
            throw new Error("No transcription was returned for this entry.");
          }
          setEntryDraft((current) => [current, transcription].filter(Boolean).join("\n"));
        } catch (error) {
          console.error("Could not transcribe report audio:", error);
          toast.error(error.response?.data?.message || "Unable to transcribe recording.");
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Could not start report audio recording:", error);
      toast.error(error.message || "Unable to access the microphone.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const invalidDateRange = fromDate && toDate && fromDate > toDate;
  const canCreateReport =
    Boolean(projectId) &&
    Boolean(fromDate) &&
    Boolean(toDate) &&
    !invalidDateRange;

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
          <p className="report-project-name">{projectTitle}</p>
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

                <div className="report-part-card">
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
                      <span className="report-part-description">{issues || "Add and track site issues"}</span>
                    </span>
                  </label>
                  <button
                    className="report-part-expand"
                    type="button"
                    aria-label={issues ? "Edit issues" : "Add issues"}
                    onClick={() => openEntryDialog("issues")}
                  >
                    <AddIcon />
                  </button>
                </div>

                <div className="report-part-card">
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
                      <span className="report-part-description">{workDown || "Include work completed / work down details"}</span>
                    </span>
                  </label>
                  <button
                    className="report-part-expand"
                    type="button"
                    aria-label={workDown ? "Edit work down" : "Add work down"}
                    onClick={() => openEntryDialog("workDown")}
                  >
                    <AddIcon />
                  </button>
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

      <Dialog
        open={Boolean(activeEntry)}
        onClose={closeEntryDialog}
        fullWidth
        maxWidth="sm"
        className="report-entry-dialog"
      >
        {activeEntry && (
          <>
            <div className="report-entry-dialog__header">
              <div>
                <h2>Submit <span>{entryConfig[activeEntry].title}</span></h2>
                <p>Report Date: {reportDate}</p>
              </div>
              <Button
                variant="outlined"
                iconOnly
                startIcon={<CloseOutlinedIcon />}
                aria-label="Close"
                onClick={closeEntryDialog}
                disabled={isRecording}
              />
            </div>
            <DialogContent className="report-entry-dialog__content">
              <label className="report-entry-dialog__label" htmlFor="report-entry-text">
                {entryConfig[activeEntry].section}
              </label>
              <textarea
                id="report-entry-text"
                className="report-entry-dialog__textarea"
                value={entryDraft}
                onChange={(event) => setEntryDraft(event.target.value)}
                placeholder={entryConfig[activeEntry].placeholder}
                disabled={isRecording}
                rows={5}
              />
              <Button
                variant="outlined"
                fullWidth
                startIcon={isRecording ? <StopOutlinedIcon /> : <MicNoneOutlinedIcon />}
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>
            </DialogContent>
            <DialogActions className="report-entry-dialog__actions">
              <Button
                variant="outlined"
                size="compact"
                type="button"
                onClick={closeEntryDialog}
                disabled={isRecording}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="compact"
                type="button"
                onClick={saveEntry}
                disabled={isRecording}
              >
                {entryConfig[activeEntry].submitLabel}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </main>
  );
}
