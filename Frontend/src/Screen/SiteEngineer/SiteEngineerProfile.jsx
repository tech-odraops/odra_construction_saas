import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, CircularProgress, Dialog, DialogContent, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import Button from "../../Components/atoms/Button/Button";
import usePopup from "../../contexts/usePopup";
import axiosInstance from "../../utils/axiosInstance";
import { getCachedOrFetchSiteEngineerProfile } from "../../utils/siteEngineerProfileApi";
import { cacheSiteEngineerProfile } from "../../utils/siteEngineerProfileCache";
import "../Founder/OrganizationProfile.css";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function SiteEngineerProfile() {
  const navigate = useNavigate();
  const { showPopup } = usePopup();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [profile, setProfile] = useState({ name: "", email: "", phoneNumber: "", role: "Site Engineer", profilePictureUrl: null });
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pictureDialogOpen, setPictureDialogOpen] = useState(false);
  const [cameraCaptureOpen, setCameraCaptureOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    getCachedOrFetchSiteEngineerProfile()
      .then((result) => {
        if (!active) return;
        setProfile({ name: result.name || "", email: result.email || "", phoneNumber: result.phoneNumber || "", role: result.role || "Site Engineer", profilePictureUrl: result.profilePictureUrl || null });
      })
      .catch((error) => {
        if (active) showPopup({ variant: "error", title: "Could not load profile", message: error.response?.data?.message || "Please try again." });
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [showPopup]);

  useEffect(() => {
    if (!cameraCaptureOpen) return undefined;

    let active = true;

    async function startCameraStream() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not supported on this device or browser.");
        return;
      }

      try {
        stopCameraStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        if (!active) return;
        console.error("Profile photo camera capture failed", error);
        setCameraError("Unable to access your camera. Please allow camera permissions or choose a photo from the gallery.");
        showPopup({
          variant: "error",
          title: "Camera access denied",
          message: "Allow camera access to take a live photo, or choose an image from the gallery.",
        });
      }
    }

    startCameraStream();

    return () => {
      active = false;
    };
  }, [cameraCaptureOpen, showPopup]);

  function stopCameraStream() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function closePictureDialog() {
    stopCameraStream();
    setCameraCaptureOpen(false);
    setCameraError("");
    setPictureDialogOpen(false);
  }

  function openCameraCapture() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showPopup({
        variant: "error",
        title: "Camera unavailable",
        message: "This browser does not support live camera capture. Please choose an image from your gallery instead.",
      });
      return;
    }

    setCameraError("");
    setCameraCaptureOpen(true);
  }

  function captureCameraPhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      showPopup({ variant: "error", title: "Camera not ready", message: "The camera is still initializing. Please try again." });
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      showPopup({ variant: "error", title: "Photo capture failed", message: "Could not process the live photo. Please try again." });
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        showPopup({ variant: "error", title: "Photo capture failed", message: "Could not process the live photo. Please try again." });
        return;
      }

      const file = new File([blob], "profile-picture.jpg", { type: "image/jpeg" });
      if (selectImage(file)) closePictureDialog();
    }, "image/jpeg", 0.9);
  }

  function changeField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function selectImage(file) {
    if (!file) return false;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showPopup({ variant: "error", title: "Unsupported file", message: "Choose a JPG, PNG, or WEBP image." });
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showPopup({ variant: "error", title: "Image too large", message: "Choose an image that is 5 MB or smaller." });
      return false;
    }
    setSelectedImage(file);
    return true;
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) {
      showPopup({ variant: "error", title: "Required information missing", message: "Name and email are required." });
      return;
    }
    const formData = new FormData();
    const userId = localStorage.getItem("User_id");
    formData.append("name", profile.name.trim());
    formData.append("email", profile.email.trim());
    formData.append("phoneNumber", profile.phoneNumber.trim());
    if (selectedImage) formData.append("profilePicture", selectedImage);
    setSaving(true);
    try {
      const { data } = await axiosInstance.patch("/profile/me", formData);
      const result = data.profile || {};
      if (userId === localStorage.getItem("User_id")) {
        cacheSiteEngineerProfile(result);
      }
      setProfile((current) => ({ ...current, ...result, phoneNumber: result.phoneNumber || "" }));
      setSelectedImage(null);
      localStorage.setItem("name", result.name || profile.name.trim());
      window.dispatchEvent(new CustomEvent("profile:updated", { detail: { name: result.name || profile.name.trim(), avatarUrl: result.profilePictureThumbnailUrl || null } }));
      showPopup({ variant: "success", title: "Changes saved", message: data.message || "Your profile has been updated." });
    } catch (error) {
      const errors = error.response?.data?.errors;
      const message = errors?.map((item) => item.message).join(" ") || error.response?.data?.message || "Could not update your profile. Please try again.";
      showPopup({ variant: "error", title: "Save failed", message });
    } finally {
      setSaving(false);
    }
  }

  const selectedImageUrl = useMemo(() => selectedImage ? URL.createObjectURL(selectedImage) : null, [selectedImage]);
  useEffect(() => () => { if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl); }, [selectedImageUrl]);
  const pictureUrl = selectedImageUrl || profile.profilePictureUrl;

  return (
    <main className="organization-profile site-engineer-profile">
      <Box className="organization-profile__heading">
        <Button iconOnly border={false} hover={false} aria-label="Back to dashboard" onClick={() => navigate(-1)} className="organization-profile__back"><ArrowBackRoundedIcon /></Button>
        <Box>
          <Typography component="h1">My Profile</Typography>
          <Typography component="p">Manage your personal information and profile picture.</Typography>
        </Box>
      </Box>
      <Box component="form" className="organization-profile__form" onSubmit={handleSave}>
        {loading ? <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <>
          <Box className="site-engineer-profile__content">
            <button className="site-engineer-profile__picture-picker" type="button" onClick={() => {
              setCameraCaptureOpen(false);
              setCameraError("");
              setPictureDialogOpen(true);
            }} aria-label="Upload profile picture">
              <Avatar src={pictureUrl || undefined} sx={{ width: 128, height: 128, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)" }}><PersonOutlineRoundedIcon sx={{ fontSize: 64 }} /></Avatar>
              <span className="organization-profile__logo-title">Change Profile Picture</span>
              <span className="organization-profile__logo-hint">PNG, JPG or WEBP (up to 5 MB)</span>
            </button>
            <Box className="site-engineer-profile__fields">
              <TextField label="Full Name" value={profile.name} onChange={(event) => changeField("name", event.target.value)} required fullWidth inputProps={{ maxLength: 120 }} />
              <TextField label="Email Address" type="email" value={profile.email} onChange={(event) => changeField("email", event.target.value)} required fullWidth />
              <TextField label="Phone Number" type="tel" value={profile.phoneNumber} onChange={(event) => changeField("phoneNumber", event.target.value)} fullWidth />
              <TextField label="Role" value={profile.role} fullWidth disabled />
            </Box>
          </Box>
          <Button type="submit" variant="contained" disabled={saving} className="organization-profile__save">{saving ? "Saving…" : "Save Changes"}</Button>
        </>}
      </Box>
      <input
        ref={fileInputRef}
        className="organization-profile__file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          if (selectImage(event.target.files?.[0])) setPictureDialogOpen(false);
          event.target.value = "";
        }}
      />
      <Dialog
        open={pictureDialogOpen}
        onClose={closePictureDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: "organization-logo-dialog site-engineer-picture-dialog" }}
      >
        <Box className="organization-logo-dialog__heading">
          <Typography component="h2">Add Profile Picture</Typography>
          <Button iconOnly border={false} aria-label="Close profile picture options" onClick={closePictureDialog}>
            <CloseRoundedIcon />
          </Button>
        </Box>
        {cameraCaptureOpen ? (
          <DialogContent className="organization-logo-dialog__camera-panel">
            <Box className="organization-camera__viewer">
              <video ref={videoRef} autoPlay playsInline muted className="organization-camera__video" />
            </Box>

            {cameraError ? (
              <Typography component="p" className="organization-camera__status">
                {cameraError}
              </Typography>
            ) : null}

            <Box className="organization-camera__actions">
              <Button type="button" variant="contained" className="organization-camera__action organization-camera__action--primary" onClick={captureCameraPhoto}>
                Capture Photo
              </Button>
              <Button type="button" className="organization-camera__action organization-camera__action--secondary" onClick={() => {
                stopCameraStream();
                setCameraCaptureOpen(false);
                setCameraError("");
              }}>
                Back
              </Button>
            </Box>
          </DialogContent>
        ) : (
          <DialogContent className="site-engineer-picture-dialog__options">
            <button
              type="button"
              className="organization-logo-option site-engineer-picture-option"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="organization-logo-option__icon"><ImageOutlinedIcon /></span>
              <strong>Choose from Gallery</strong>
              <span>Upload an image from your device</span>
            </button>
            <button
              type="button"
              className="organization-logo-option site-engineer-picture-option"
              onClick={openCameraCapture}
            >
              <span className="organization-logo-option__icon"><PhotoCameraOutlinedIcon /></span>
              <strong>Take Photo</strong>
              <span>Capture a new photo</span>
            </button>
          </DialogContent>
        )}
      </Dialog>
      <canvas ref={canvasRef} className="organization-profile__camera-canvas" />
    </main>
  );
}
