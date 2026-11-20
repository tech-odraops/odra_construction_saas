import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Box, Dialog, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Button from "../Button/Button";
import ImageCropDialog from "../ImageCropDialog/ImageCropDialog";
import usePopup from "../../../contexts/usePopup";
import "./CameraCapture.css";

export default function CameraCapture({
  open,
  onCapture,
  onClose,
  facingMode = "environment",
  title = "Camera",
  cropImage = false,
}) {
  const { showPopup } = usePopup();
  const titleId = useId();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open || capturedPhoto) return undefined;
    let active = true;
    setCameraError("");
    setCameraReady(false);

    async function startCameraStream() {
      if (!navigator.mediaDevices?.getUserMedia) {
        const message = "Camera access is not available in this browser. Choose an image from your gallery instead.";
        setCameraError(message);
        showPopup({ variant: "error", title: "Camera unavailable", message });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (!videoRef.current) throw new Error("Camera preview could not be initialized.");
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (active) setCameraReady(true);
      } catch (error) {
        if (!active) return;
        stopCameraStream();
        const message = error?.name === "NotAllowedError"
          ? "Allow camera access to take a photo, or choose an image from your gallery."
          : error?.name === "NotFoundError"
            ? "No camera was found. Choose an image from your gallery instead."
            : "Could not open the camera. Choose an image from your gallery instead.";
        setCameraError(message);
        showPopup({ variant: "error", title: "Camera unavailable", message });
      }
    }

    startCameraStream();
    return () => {
      active = false;
      stopCameraStream();
    };
  }, [capturedPhoto, facingMode, open, showPopup, stopCameraStream]);

  useEffect(() => {
    if (!open && capturedPhoto) setCapturedPhoto(null);
  }, [capturedPhoto, open]);

  function closeCamera(reason = "cancel") {
    stopCameraStream();
    setCameraReady(false);
    setCameraError("");
    setCapturedPhoto(null);
    onClose?.(reason);
  }

  function acceptPhoto(file) {
    if (onCapture?.(file) === false) return;
    closeCamera("captured");
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth || !video.videoHeight) {
      showPopup({ variant: "error", title: "Camera not ready", message: "Wait for the camera preview, then try again." });
      return;
    }

    const scale = Math.min(1, 1920 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      showPopup({ variant: "error", title: "Photo capture failed", message: "Could not process the camera photo." });
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!photoBlob) {
      showPopup({ variant: "error", title: "Photo capture failed", message: "Could not process the camera photo." });
      return;
    }

    const file = new File([photoBlob], `camera-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    if (cropImage) {
      stopCameraStream();
      setCameraReady(false);
      setCapturedPhoto(file);
      return;
    }
    acceptPhoto(file);
  }

  return (
    <>
      <Dialog
        open={Boolean(open && !capturedPhoto)}
        onClose={() => closeCamera("cancel")}
        fullWidth
        maxWidth="sm"
        className="camera-capture"
        aria-labelledby={titleId}
      >
        <Box className="camera-capture__header">
          <Typography id={titleId} component="h2">{title}</Typography>
          <Button
            iconOnly
            border={false}
            hover={false}
            onClick={() => closeCamera("cancel")}
            aria-label="Close camera"
            style={{ color: "var(--palette-text-secondary)" }}
          >
            <CloseRoundedIcon />
          </Button>
        </Box>
        <Box className="camera-capture__content">
          <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" />
          {cameraError && <Typography role="alert">{cameraError}</Typography>}
          <Box className="camera-capture__actions">
            <Button variant="outlined" size="compact" onClick={() => closeCamera("cancel")}>Cancel</Button>
            <Button
              variant="contained"
              size="compact"
              onClick={capturePhoto}
              disabled={!cameraReady}
            >
              Capture Photo
            </Button>
          </Box>
        </Box>
      </Dialog>
      {cropImage && (
        <ImageCropDialog
          open={Boolean(open && capturedPhoto)}
          file={capturedPhoto}
          title="Crop captured photo"
          onClose={() => closeCamera("cancel")}
          onCrop={acceptPhoto}
          onUseOriginal={acceptPhoto}
        />
      )}
    </>
  );
}
