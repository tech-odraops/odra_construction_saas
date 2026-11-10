import { useRef, useState } from "react";
import {
  Box,
  InputAdornment,
  MenuItem,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

const categories = ["General", "Ceiling", "Civil", "Electrical"];

export default function CreateTaskForm({ siteEngineers = [], onBack, onDone }) {
  const attachmentInputRef = useRef(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [progress, setProgress] = useState(0);
  const [showQuantity, setShowQuantity] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [nameError, setNameError] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }

    onDone?.({
      name: trimmedName,
      category,
      progress,
      quantity: quantity ? Number(quantity) : null,
      unit,
      assignee,
      startDate,
      endDate,
      attachmentNames: attachments.map((file) => file.name),
    });
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
          select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="create-task-form__category"
          fullWidth
          inputProps={{ "aria-label": "Task category" }}
        >
          {categories.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>

        <Box className="create-task-form__progress">
          <Slider
            value={progress}
            onChange={(_, value) => setProgress(value)}
            aria-label="Task progress"
            min={0}
            max={100}
          />
        </Box>

        <Box className="create-task-form__quantity-area">
          <button type="button" className="create-task-form__add-quantity" onClick={() => setShowQuantity((visible) => !visible)}>
            <AddRoundedIcon />
            <span>{showQuantity ? "Remove total qty and units" : "Add total qty and units"}</span>
          </button>
          {showQuantity && (
            <Box className="create-task-form__quantity-fields">
              <TextField label="Total quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputProps={{ min: 0 }} />
              <TextField select label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)}>
                <MenuItem value="sq ft">sq ft</MenuItem>
                <MenuItem value="m²">m²</MenuItem>
                <MenuItem value="ft">ft</MenuItem>
                <MenuItem value="kg">kg</MenuItem>
                <MenuItem value="units">units</MenuItem>
              </TextField>
            </Box>
          )}
        </Box>

        <Box className="create-task-form__attachments">
          <Typography component="p">Add Attachments (Optional)</Typography>
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => setAttachments(Array.from(event.target.files || []))}
          />
          <button type="button" className="create-task-form__attachment-picker" onClick={() => attachmentInputRef.current?.click()} aria-label="Add task attachments">
            <AddRoundedIcon />
          </button>
          {attachments.length > 0 && <span className="create-task-form__attachment-count">{attachments.length} file{attachments.length === 1 ? "" : "s"} selected</span>}
        </Box>

        <Box className="create-task-form__details">
          <TextField
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
          </TextField>
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

        <button type="submit" className="create-task-form__done">Done</button>
      </Box>
    </Box>
  );
}
