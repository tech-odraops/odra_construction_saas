import { useEffect, useRef, useState } from "react";
import { Box, Dialog, IconButton, InputAdornment, MenuItem, Slider, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import usePopup from "../../contexts/usePopup";
import TaskUnitsManager from "./TaskUnitsManager";
import Button from "../../Components/atoms/Button/Button";
import CameraCapture from "../../Components/atoms/CameraCapture/CameraCapture";
import ImageCropDialog from "../../Components/atoms/ImageCropDialog/ImageCropDialog";

export default function CreateTaskForm({ siteEngineers = [], categories = [], units = [], loading = false, allowAssignment = true, onUnitsChange, onManageCategories, onBack, onDone }) {
  const { showPopup } = usePopup();
  const attachmentInputRef = useRef(null);
  const attachmentPreviewUrlsRef = useRef(new Set());
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [progressUnitId, setProgressUnitId] = useState("");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [galleryUnavailable, setGalleryUnavailable] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cropQueue, setCropQueue] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [quantityFieldsOpen, setQuantityFieldsOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unitsManagerOpen, setUnitsManagerOpen] = useState(false);

  const activeCategories = categories.filter((category) => category.isActive !== false);
  const selectedCategory = activeCategories.find((category) => category._id === categoryId);
  const filteredCategories = activeCategories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );
  const activeUnits = units.filter((unit) => unit.isActive !== false);
  const selectedUnit = activeUnits.find((unit) => unit._id === progressUnitId);
  const filteredUnits = activeUnits.filter((unit) =>
    `${unit.abbreviation} ${unit.name}`.toLowerCase().includes(unitSearch.trim().toLowerCase())
  );
  useEffect(() => () => {
    attachmentPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function closeCategoryPicker() {
    setCategoryPickerOpen(false);
    setCategorySearch("");
  }

  function closeUnitPicker() {
    setUnitPickerOpen(false);
    setUnitSearchOpen(false);
    setUnitSearch("");
  }

  function closeAttachmentPicker() {
    setAttachmentPickerOpen(false);
    setGalleryUnavailable(false);
  }

  function appendAttachment(file) {
    const url = URL.createObjectURL(file);
    attachmentPreviewUrlsRef.current.add(url);
    setAttachments((current) => [...current, file].slice(0, 10));
    setAttachmentPreviews((current) => [...current, { file, url }].slice(0, 10));
  }

  function addAttachmentFiles(files) {
    if (!files.length) return false;

    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
    const remainingSlots = Math.max(0, 10 - attachments.length - cropQueue.length);
    const errors = [];
    if (validFiles.length > remainingSlots) errors.push("Choose no more than 10 task attachments.");
    if (validFiles.length !== files.length) errors.push("Each photo must be 5 MB or smaller.");
    if (errors.length) {
      showPopup({ variant: "error", title: "Attachment selection issue", message: errors.join(" ") });
    }

    const filesToCrop = validFiles.slice(0, remainingSlots);
    if (filesToCrop.length) setCropQueue((current) => [...current, ...filesToCrop]);
    return filesToCrop.length > 0;
  }

  function addCameraAttachment(file) {
    if (file.size > 5 * 1024 * 1024) {
      showPopup({ variant: "error", title: "Image too large", message: "The camera photo must be 5 MB or smaller." });
      return false;
    }
    if (attachments.length + cropQueue.length >= 10) {
      showPopup({ variant: "error", title: "Attachment limit reached", message: "Choose no more than 10 task attachments." });
      return false;
    }
    appendAttachment(file);
    return true;
  }

  function handleAttachmentFilesChange(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    closeAttachmentPicker();
    addAttachmentFiles(files);
  }

  function openCameraCapture() {
    closeAttachmentPicker();
    setCameraDialogOpen(true);
  }

  function closeCameraCapture() {
    setCameraDialogOpen(false);
  }

  function saveCroppedAttachment(file) {
    if (file.size > 5 * 1024 * 1024) {
      showPopup({ variant: "error", title: "Image too large", message: "The cropped image must be 5 MB or smaller." });
      return;
    }
    appendAttachment(file);
    setCropQueue((current) => current.slice(1));
  }

  function useOriginalAttachment(file) {
    appendAttachment(file);
    setCropQueue((current) => current.slice(1));
  }

  function cancelPendingCrops() {
    setCropQueue([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const title = name.trim();
    if (!title) {
      setNameError(true);
      return;
    }
    if (!categoryId) {
      setCategoryPickerOpen(true);
      showPopup({ variant: "error", title: "Task category required", message: "Choose a task category." });
      return;
    }
    if (!progressUnitId || !quantity || Number(quantity) <= 0) {
      setQuantityFieldsOpen(true);
      showPopup({
        variant: "error",
        title: "Quantity and unit required",
        message: "Choose a unit and enter a total quantity greater than zero.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await onDone?.({
        title,
        categoryId,
        progressUnitId,
        totalQuantity: Number(quantity),
        assignees: assignee ? [assignee] : [],
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        attachments,
      });
    } catch (error) {
      showPopup({
        variant: "error",
        title: "Task creation failed",
        message: error.response?.data?.message || "Could not create the task.",
      });
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
          value={selectedCategory?.name || ""}
          onClick={() => setCategoryPickerOpen(true)}
          className="create-task-form__category"
          fullWidth
          placeholder="Select category"
          inputProps={{
            "aria-label": "Task category",
            "aria-haspopup": "dialog",
            readOnly: true,
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setCategoryPickerOpen(true);
              }
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <KeyboardArrowDownRoundedIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box className="create-task-form__progress">
          <Slider value={0} disabled aria-label="Task progress starts at 0 percent" min={0} max={100} />
        </Box>

        <Box className="create-task-form__quantity-area">
          <button
            type="button"
            className={`create-task-form__add-quantity${quantityFieldsOpen ? " create-task-form__add-quantity--open" : ""}`}
            onClick={() => setQuantityFieldsOpen((open) => !open)}
            aria-expanded={quantityFieldsOpen}
            aria-controls="create-task-quantity-fields"
          >
            <AddRoundedIcon />
            <span>{quantityFieldsOpen ? "Remove total qty and units" : "Add total qty and units"}</span>
          </button>
          {quantityFieldsOpen && (
            <Box id="create-task-quantity-fields" className="create-task-form__quantity-fields">
              <TextField
                label="Total quantity"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputProps={{ min: 0.01, step: "any", "aria-label": "Total quantity" }}
              />
              <TextField
                value={selectedUnit ? `${selectedUnit.name} (${selectedUnit.abbreviation})` : ""}
                onClick={() => setUnitPickerOpen(true)}
                className="create-task-form__unit"
                placeholder="Select unit"
                inputProps={{
                  "aria-label": "Progress unit",
                  "aria-haspopup": "dialog",
                  readOnly: true,
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setUnitPickerOpen(true);
                    }
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <KeyboardArrowDownRoundedIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </Box>

        <Box className="create-task-form__attachments">
          <Typography component="p">Add Attachments (Optional)</Typography>
          <input
            ref={attachmentInputRef}
            className="create-task-form__file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleAttachmentFilesChange}
          />
          <Box className="create-task-form__attachment-row">
            <button type="button" className="create-task-form__attachment-picker" onClick={() => setAttachmentPickerOpen(true)} aria-label="Add task attachments">
              <AddRoundedIcon />
            </button>
            {attachmentPreviews.map(({ file, url }, index) => (
              <Box
                component="figure"
                className="create-task-form__attachment-preview"
                key={`${file.name}-${file.lastModified}-${index}`}
              >
                <img src={url} alt="" />
                <Typography component="figcaption" title={file.name}>{file.name}</Typography>
              </Box>
            ))}
          </Box>
          {attachments.length > 0 && <span className="create-task-form__attachment-count">{attachments.length} attachment{attachments.length === 1 ? "" : "s"} selected</span>}
        </Box>

        <Box className={`create-task-form__details${allowAssignment ? "" : " create-task-form__details--without-assignment"}`}>
          {allowAssignment && <TextField
            select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className="create-task-form__detail-field"
            SelectProps={{ displayEmpty: true }}
            inputProps={{ "aria-label": "Assign site engineer" }}
          >
            <MenuItem value=""><PersonAddAltOutlinedIcon className="create-task-form__assign-icon" /> <span>Assign</span></MenuItem>
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
      <Dialog
        open={categoryPickerOpen}
        onClose={closeCategoryPicker}
        fullWidth
        maxWidth="sm"
        className="task-category-picker"
        aria-labelledby="task-category-picker-title"
      >
        <Box className="task-category-picker__header">
          <Typography id="task-category-picker-title" component="h2">Select Work Category</Typography>
          <Box className="task-category-picker__search">
            <SearchRoundedIcon />
            <input
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Search category..."
              aria-label="Search category"
              autoComplete="off"
            />
          </Box>
          <Button
            iconOnly
            border={false}
            hover={false}
            onClick={closeCategoryPicker}
            aria-label="Close category picker"
            style={{ color: "var(--palette-text-secondary)" }}
          >
            <CloseRoundedIcon />
          </Button>
        </Box>
        <Box className="task-category-picker__body">
          <button
            type="button"
            className="task-category-picker__add"
            onClick={() => {
              closeCategoryPicker();
              onManageCategories?.();
            }}
          >
            <span className="task-category-picker__add-icon"><HomeWorkOutlinedIcon /></span>
            <span>Add new category</span>
          </button>

          <Box className="task-category-picker__list">
            {filteredCategories.map((category) => (
              <button
                type="button"
                key={category._id}
                className={`task-category-picker__option${categoryId === category._id ? " task-category-picker__option--selected" : ""}`}
                onClick={() => {
                  setCategoryId(category._id);
                  closeCategoryPicker();
                }}
              >
                <span className={`task-category-picker__category-icon task-category-picker__category-icon--${category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  {category.icon && /^https?:\/\//i.test(category.icon) ? (
                    <img src={category.icon} alt="" />
                  ) : (
                    <span>{category.icon || category.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="task-category-picker__name">{category.name}</span>
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <Typography className="task-category-picker__empty">
                {categorySearch.trim() ? "No categories match your search." : "No active categories available."}
              </Typography>
            )}
          </Box>
        </Box>
      </Dialog>
      <Dialog
        open={unitPickerOpen}
        onClose={closeUnitPicker}
        fullWidth
        maxWidth="sm"
        className="task-unit-picker"
        aria-labelledby="task-unit-picker-title"
      >
        <Box className="task-unit-picker__header">
          <Typography id="task-unit-picker-title" component="h2">Select unit of work update</Typography>
          <IconButton
            className="task-unit-picker__action"
            onClick={() => {
              closeUnitPicker();
              setUnitsManagerOpen(true);
            }}
            aria-label="Add unit"
          >
            <AddRoundedIcon />
          </IconButton>
          <IconButton
            className={`task-unit-picker__action${unitSearchOpen ? " task-unit-picker__action--active" : ""}`}
            onClick={() => {
              setUnitSearchOpen((open) => !open);
              setUnitSearch("");
            }}
            aria-label={unitSearchOpen ? "Close unit search" : "Search units"}
          >
            <SearchRoundedIcon />
          </IconButton>
          <Button
            iconOnly
            border={false}
            hover={false}
            onClick={closeUnitPicker}
            aria-label="Close unit picker"
            style={{ color: "var(--palette-text-secondary)" }}
          >
            <CloseRoundedIcon />
          </Button>
        </Box>
        {unitSearchOpen && (
          <Box className="task-unit-picker__search">
            <SearchRoundedIcon />
            <input
              value={unitSearch}
              onChange={(event) => setUnitSearch(event.target.value)}
              placeholder="Search unit..."
              aria-label="Search units"
              autoComplete="off"
            />
          </Box>
        )}
        <Box className="task-unit-picker__list">
          {filteredUnits.map((unit) => (
            <button
              type="button"
              key={unit._id}
              className={`task-unit-picker__option${progressUnitId === unit._id ? " task-unit-picker__option--selected" : ""}`}
              onClick={() => {
                setProgressUnitId(unit._id);
                closeUnitPicker();
              }}
            >
              <span>{unit.abbreviation}</span>
              <span>{unit.name}</span>
            </button>
          ))}
          {filteredUnits.length === 0 && (
            <Typography className="task-unit-picker__empty">
              {unitSearch.trim() ? "No units match your search." : "No active units available."}
            </Typography>
          )}
        </Box>
      </Dialog>
      <Dialog
        open={attachmentPickerOpen}
        onClose={closeAttachmentPicker}
        fullWidth
        maxWidth="xs"
        className="task-attachment-picker"
        aria-labelledby="task-attachment-picker-title"
      >
        <Box className="task-attachment-picker__header">
          <Typography id="task-attachment-picker-title" component="h2">Add Attachment</Typography>
          <Button
            iconOnly
            border={false}
            hover={false}
            onClick={closeAttachmentPicker}
            aria-label="Close attachment picker"
            style={{ color: "var(--palette-text-secondary)" }}
          >
            <CloseRoundedIcon />
          </Button>
        </Box>
        <Box className="task-attachment-picker__options">
          <button
            type="button"
            className="task-attachment-picker__option"
            onClick={openCameraCapture}
          >
            <PhotoCameraOutlinedIcon />
            <span>Camera</span>
          </button>
          <button
            type="button"
            className="task-attachment-picker__option"
            onClick={() => setGalleryUnavailable(true)}
          >
            <AddPhotoAlternateOutlinedIcon />
            <span>ODRAOPS Gallery</span>
          </button>
          <button
            type="button"
            className="task-attachment-picker__option"
            onClick={() => {
              closeAttachmentPicker();
              attachmentInputRef.current?.click();
            }}
          >
            <ImageOutlinedIcon />
            <span>Phone Gallery</span>
          </button>
          {galleryUnavailable && (
            <Typography className="task-attachment-picker__placeholder" role="status">
              ODRAOPS Gallery is coming soon.
            </Typography>
          )}
        </Box>
      </Dialog>
      <CameraCapture
        open={cameraDialogOpen}
        cropImage={true}
        onCapture={addCameraAttachment}
        onClose={closeCameraCapture}
      />
      <ImageCropDialog
        open={cropQueue.length > 0}
        file={cropQueue[0] || null}
        title="Crop attachment"
        onClose={cancelPendingCrops}
        onCrop={saveCroppedAttachment}
        onUseOriginal={useOriginalAttachment}
      />
    </Box>
  );
}
