import { useRef, useState } from "react";
import { Box, InputAdornment, MenuItem, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { toast } from "react-toastify";
import TaskUnitsManager from "./TaskUnitsManager";

export default function CreateTaskForm({ siteEngineers = [], categories = [], units = [], loading = false, allowAssignment = true, onUnitsChange, onBack, onDone }) {
  const attachmentInputRef = useRef(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [progressUnitId, setProgressUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unitsManagerOpen, setUnitsManagerOpen] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const title = name.trim();
    if (!title) {
      setNameError(true);
      return;
    }
    if (!categoryId || !progressUnitId || !quantity || Number(quantity) <= 0) {
      toast.error("Choose a category and unit, and enter a total quantity greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await onDone?.({
        title,
        description,
        categoryId,
        progressUnitId,
        totalQuantity: Number(quantity),
        assignees: assignee ? [assignee] : [],
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        attachments,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create the task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box className="create-task-page">
      <Box className="create-task-page__heading">
        <button type="button" className="create-task-page__back" onClick={onBack} aria-label="Back to tasks">
          <ArrowBackRoundedIcon />
        </button>
        <Typography component="h1">Create Task</Typography>
      </Box>

      <Box component="form" className="create-task-form" onSubmit={handleSubmit}>
        <TextField
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (event.target.value.trim()) setNameError(false);
          }}
          placeholder="E.g.- Excavation, Painting, Brickwork etc."
          error={nameError}
          helperText={nameError ? "Enter a task name." : null}
          inputProps={{ maxLength: 120, "aria-label": "Task name" }}
          className="create-task-form__name"
          fullWidth
        />

        <TextField
          label="Description (Optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          multiline
          minRows={2}
          fullWidth
        />

        <TextField
          select
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="create-task-form__category"
          fullWidth
          label="Task category"
          inputProps={{ "aria-label": "Task category" }}
        >
          {categories.filter((category) => category.isActive !== false).map((category) => (
            <MenuItem key={category._id} value={category._id}>{category.name}</MenuItem>
          ))}
        </TextField>

        <Box className="create-task-form__quantity-fields">
          <TextField
            required
            label="Total quantity"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputProps={{ min: 0.01, step: "any" }}
          />
          <TextField
            select
            required
            label="Progress unit"
            value={progressUnitId}
            onChange={(event) => setProgressUnitId(event.target.value)}
          >
            {units.filter((unit) => unit.isActive !== false).map((unit) => (
              <MenuItem key={unit._id} value={unit._id}>{unit.name} ({unit.abbreviation})</MenuItem>
            ))}
          </TextField>
          <button type="button" className="create-task-form__add-quantity" onClick={() => setUnitsManagerOpen(true)}>
            <AddRoundedIcon />
            <span>Manage task units</span>
          </button>
        </Box>

        <Box className="create-task-form__attachments">
          <Typography component="p">Add Photos (Optional)</Typography>
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
              if (files.length > 10) toast.error("Choose no more than 10 task photos.");
              if (validFiles.length !== files.length) toast.error("Each photo must be 5 MB or smaller.");
              setAttachments(validFiles.slice(0, 10));
            }}
          />
          <button type="button" className="create-task-form__attachment-picker" onClick={() => attachmentInputRef.current?.click()} aria-label="Add task photos">
            <AddRoundedIcon />
          </button>
          {attachments.length > 0 && <span className="create-task-form__attachment-count">{attachments.length} photo{attachments.length === 1 ? "" : "s"} selected</span>}
        </Box>

        <Box className="create-task-form__details">
          {allowAssignment && <TextField
            select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className="create-task-form__detail-field"
            SelectProps={{ displayEmpty: true }}
            inputProps={{ "aria-label": "Assign site engineer" }}
          >
            <MenuItem value=""><PersonAddAltOutlinedIcon /> <span>Assign</span></MenuItem>
            {siteEngineers.map((engineer, index) => {
              const id = typeof engineer === "object" ? engineer?._id : engineer;
              const label = typeof engineer === "object" ? engineer?.name : engineer;
              return <MenuItem key={id || index} value={id || label}>{label || "Site Engineer"}</MenuItem>;
            })}
          </TextField>}
          <TextField
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="create-task-form__detail-field"
            label="Start Date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ "aria-label": "Start date" }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthOutlinedIcon /></InputAdornment> }}
          />
          <TextField
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="create-task-form__detail-field"
            label="End Date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ "aria-label": "End date" }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthOutlinedIcon /></InputAdornment> }}
          />
        </Box>

        <button type="submit" className="create-task-form__done" disabled={submitting || loading || !categories.length || !units.some((unit) => unit.isActive !== false)}>
          {loading ? "Loading options…" : submitting ? "Creating…" : "Done"}
        </button>
      </Box>
      <TaskUnitsManager open={unitsManagerOpen} onClose={() => setUnitsManagerOpen(false)} onUnitsChange={onUnitsChange} />
    </Box>
  );
}
