import { useEffect, useId, useRef, useState } from "react";
import { Box, Dialog, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Button from "../Button/Button";
import usePopup from "../../../contexts/usePopup";
import "./ImageCropDialog.css";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 720;
const MAX_OUTPUT_EDGE = 1600;

function getImageLayout(image) {
  const scale = Math.min(
    CANVAS_WIDTH / image.naturalWidth,
    CANVAS_HEIGHT / image.naturalHeight
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  return {
    x: (CANVAS_WIDTH - width) / 2,
    y: (CANVAS_HEIGHT - height) / 2,
    width,
    height,
    scale,
  };
}

function getCropBounds(image, crop) {
  const layout = getImageLayout(image);
  const selectedCrop = crop || layout;
  return {
    sourceX: (selectedCrop.x - layout.x) / layout.scale,
    sourceY: (selectedCrop.y - layout.y) / layout.scale,
    sourceWidth: selectedCrop.width / layout.scale,
    sourceHeight: selectedCrop.height / layout.scale,
  };
}

function drawCropPreview(canvas, image, crop) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const layout = getImageLayout(image);
  const selectedCrop = crop || layout;

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.drawImage(image, layout.x, layout.y, layout.width, layout.height);
  context.fillStyle = "rgba(16, 24, 40, 0.62)";
  context.fillRect(0, 0, CANVAS_WIDTH, selectedCrop.y);
  context.fillRect(0, selectedCrop.y, selectedCrop.x, selectedCrop.height);
  context.fillRect(
    selectedCrop.x + selectedCrop.width,
    selectedCrop.y,
    CANVAS_WIDTH - selectedCrop.x - selectedCrop.width,
    selectedCrop.height
  );
  context.fillRect(
    0,
    selectedCrop.y + selectedCrop.height,
    CANVAS_WIDTH,
    CANVAS_HEIGHT - selectedCrop.y - selectedCrop.height
  );
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.strokeRect(selectedCrop.x, selectedCrop.y, selectedCrop.width, selectedCrop.height);
}

export default function ImageCropDialog({
  open,
  file,
  onClose,
  onCrop,
  onUseOriginal,
  title = "Crop image",
}) {
  const { showPopup } = usePopup();
  const titleId = useId();
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!open || !file) return undefined;
    let active = true;
    const objectUrl = URL.createObjectURL(file);
    const loadedImage = new Image();
    setImage(null);
    setCrop(null);
    setImageError("");

    loadedImage.onload = () => {
      if (!active) return;
      setImage(loadedImage);
      setCrop(getImageLayout(loadedImage));
    };
    loadedImage.onerror = () => {
      if (!active) return;
      const message = "Could not load this image for cropping.";
      setImageError(message);
      showPopup({ variant: "error", title: "Image crop failed", message });
    };
    loadedImage.src = objectUrl;

    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, open, showPopup]);

  useEffect(() => {
    if (canvasRef.current && image) drawCropPreview(canvasRef.current, image, crop);
  }, [crop, image]);

  function getPoint(event) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const layout = getImageLayout(image);
    const rawX = (event.clientX - bounds.left) * CANVAS_WIDTH / bounds.width;
    const rawY = (event.clientY - bounds.top) * CANVAS_HEIGHT / bounds.height;
    return {
      x: Math.min(layout.x + layout.width, Math.max(layout.x, rawX)),
      y: Math.min(layout.y + layout.height, Math.max(layout.y, rawY)),
      inside: rawX >= layout.x && rawX <= layout.x + layout.width
        && rawY >= layout.y && rawY <= layout.y + layout.height,
    };
  }

  function handlePointerDown(event) {
    if (!image) return;
    const point = getPoint(event);
    if (!point.inside) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: point,
      selection: crop,
    };
    setCrop({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const end = getPoint(event);
    const left = Math.min(drag.start.x, end.x);
    const top = Math.min(drag.start.y, end.y);
    setCrop({
      x: left,
      y: top,
      width: Math.abs(end.x - drag.start.x),
      height: Math.abs(end.y - drag.start.y),
    });
  }

  function handlePointerUp(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = getPoint(event);
    const width = Math.abs(point.x - drag.start.x);
    const height = Math.abs(point.y - drag.start.y);
    if (width < 8 || height < 8) setCrop(drag.selection);
    else {
      setCrop({
        x: Math.min(drag.start.x, point.x),
        y: Math.min(drag.start.y, point.y),
        width,
        height,
      });
    }
    dragRef.current = null;
  }

  function handleCanvasKeyDown(event) {
    if (!image) return;
    const step = event.shiftKey ? 32 : 8;
    const direction = {
      ArrowLeft: { width: -step, height: 0 },
      ArrowRight: { width: step, height: 0 },
      ArrowUp: { width: 0, height: -step },
      ArrowDown: { width: 0, height: step },
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    const layout = getImageLayout(image);
    setCrop((current) => ({
      ...current,
      width: Math.min(layout.x + layout.width - current.x, Math.max(8, current.width + direction.width)),
      height: Math.min(layout.y + layout.height - current.y, Math.max(8, current.height + direction.height)),
    }));
  }

  async function saveCrop() {
    if (!image || !file || !crop?.width || !crop?.height) return;
    const bounds = getCropBounds(image, crop);
    const outputScale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(bounds.sourceWidth, bounds.sourceHeight));
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(bounds.sourceWidth * outputScale));
    output.height = Math.max(1, Math.round(bounds.sourceHeight * outputScale));
    const context = output.getContext("2d");
    if (!context) {
      showPopup({ variant: "error", title: "Image crop failed", message: "Could not process the cropped image." });
      return;
    }

    context.drawImage(
      image,
      bounds.sourceX,
      bounds.sourceY,
      bounds.sourceWidth,
      bounds.sourceHeight,
      0,
      0,
      output.width,
      output.height
    );
    const blob = await new Promise((resolve) => output.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      showPopup({ variant: "error", title: "Image crop failed", message: "Could not process the cropped image." });
      return;
    }

    const filename = file.name.replace(/\.[^.]+$/, "") || "image";
    onCrop?.(new File([blob], `${filename}-cropped.jpg`, { type: "image/jpeg" }));
  }

  return (
    <Dialog
      open={Boolean(open && file)}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      className="image-crop-dialog"
      aria-labelledby={titleId}
    >
      <Box className="image-crop-dialog__header">
        <Typography id={titleId} component="h2">{title}</Typography>
        <Button
          iconOnly
          border={false}
          hover={false}
          onClick={onClose}
          aria-label="Close image crop"
          style={{ color: "var(--palette-text-secondary)" }}
        >
          <CloseRoundedIcon />
        </Button>
      </Box>
      <Box className="image-crop-dialog__content">
        <Typography className="image-crop-dialog__instructions">
          Drag over the image to draw a free-form crop. Draw again or use arrow keys to adjust it.
        </Typography>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="image-crop-dialog__canvas"
          tabIndex={0}
          aria-label="Image crop area. Drag to draw a free-form crop or use arrow keys to resize it."
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {imageError && <Typography role="alert">{imageError}</Typography>}
        <Box className="image-crop-dialog__actions">
          <Button variant="outlined" size="compact" onClick={onClose}>Cancel</Button>
          <Button variant="outlined" size="compact" onClick={() => onUseOriginal?.(file)} disabled={!image}>
            Use Original
          </Button>
          <Button variant="contained" size="compact" onClick={saveCrop} disabled={!image}>Save Crop</Button>
        </Box>
      </Box>
    </Dialog>
  );
}
