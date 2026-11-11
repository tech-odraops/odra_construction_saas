
import { useEffect, useMemo, useRef, useState } from "react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom";
import { Avatar, Box, CircularProgress, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Button from "../../Components/atoms/Button/Button";
import Input from "../../Components/atoms/Input/Input";
import usePopup from "../../contexts/usePopup";
import axiosInstance from "../../utils/axiosInstance";
import "./OrganizationProfile.css";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function OrganizationProfile() {
  const navigate = useNavigate();
  const { showPopup } = usePopup();
  const fileInputRef = useRef(null);
  const [organization, setOrganization] = useState({ name: "", logoUrl: null });
  const [name, setName] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    axiosInstance.get("/profile/organization")
      .then(({ data }) => {
        if (!active) return;
        const profile = data.organization || {};
        setOrganization(profile);
        setName(profile.name || "");
        localStorage.setItem("organizationName", profile.name || "");
      })
      .catch((error) => {
        if (!active) return;
        showPopup({ variant: "error", title: "Could not load profile", message: error.response?.data?.message || "Please try again." });
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [showPopup]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [organizationName, setOrganizationName] = useState(
    () => localStorage.getItem("organizationName") || localStorage.getItem("name") || "",
  );
  const [savedLogo, setSavedLogo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ORGANIZATION_LOGO_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [cameraCaptureOpen, setCameraCaptureOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraCaptureOpen) {
      return;
    }

    let active = true;

    async function startCameraStream() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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
        if (!active) {
          return;
        }
        console.error("Camera capture failed", error);
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

  const logo = selectedLogo || savedLogo;

  function stopCameraStream() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function closeLogoDialog() {
    stopCameraStream();
    setCameraCaptureOpen(false);
    setCameraError("");
    setLogoDialogOpen(false);
  }

  function selectImage(file) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showPopup({ variant: "error", title: "Unsupported file", message: "Choose a JPG, PNG, or WEBP image." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showPopup({ variant: "error", title: "Image too large", message: "Choose an image that is 5 MB or smaller." });
      return;
    }
    setSelectedLogo(file);
  }

  async function openCameraCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showPopup({ variant: "error", title: "Camera unavailable", message: "This browser does not support live camera capture. Please choose an image from your gallery instead." });
      return;
    }

    setCameraError("");
    setCameraCaptureOpen(true);
    setLogoDialogOpen(true);
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
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedLogo({ type: "image", value: imageData });
    closeLogoDialog();
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!name.trim()) {
      showPopup({ variant: "error", title: "Organization name required", message: "Enter an organization name before saving." });
      return;
    }
    const formData = new FormData();
    formData.append("name", name.trim());
    if (selectedLogo) formData.append("logo", selectedLogo);
    setSaving(true);
    try {
      const { data } = await axiosInstance.patch("/profile/organization", formData);
      const profile = data.organization || {};
      setOrganization(profile);
      setName(profile.name || name.trim());
      setSelectedLogo(null);
      localStorage.setItem("organizationName", profile.name || name.trim());
      window.dispatchEvent(new CustomEvent("profile:updated", { detail: { name: profile.name || name.trim(), avatarUrl: profile.logoUrl || null } }));
      showPopup({ variant: "success", title: "Changes saved", message: data.message || "Your organization profile has been updated." });
    } catch (error) {
      showPopup({ variant: "error", title: "Save failed", message: error.response?.data?.message || "Could not update your organization profile. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const selectedLogoUrl = useMemo(() => selectedLogo ? URL.createObjectURL(selectedLogo) : null, [selectedLogo]);
  useEffect(() => () => { if (selectedLogoUrl) URL.revokeObjectURL(selectedLogoUrl); }, [selectedLogoUrl]);
  const logoUrl = selectedLogoUrl || organization.logoUrl;

  return (
    <main className="organization-profile">
      <Box className="organization-profile__heading">
        <Button iconOnly border={false} hover={false} aria-label="Back to dashboard" onClick={() => navigate(-1)} className="organization-profile__back"><ArrowBackRoundedIcon /></Button>
        <Box>
          <Typography component="h1">Organisation Profile</Typography>
          <Typography component="p">Update your organisation details and logo. This information will be used across your reports and projects.</Typography>
        </Box>
      </Box>
      <Box component="form" className="organization-profile__form" onSubmit={handleSave}>
        {loading ? <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <>
          <Box className="organization-profile__details">
            <button className="organization-profile__logo-picker" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload organization logo">
              <Avatar className="organization-profile__logo-circle" src={logoUrl || undefined} alt="Organization logo" sx={{ width: 128, height: 128 }}>{!logoUrl && <AddRoundedIcon />}</Avatar>
              <span className="organization-profile__logo-add"><AddRoundedIcon /></span>
              <span className="organization-profile__logo-title">Upload Organisation Logo</span>
              <span className="organization-profile__logo-hint">PNG, JPG or WEBP (up to 5 MB)</span>
            </button>
            <Box className="organization-profile__fields">
              <Input id="organization-name" value={name} onChange={(event) => setName(event.target.value)} label="Organisation Name" placeholder="Enter organisation name" maxLength={120} />
              <Typography component="p">This name will be displayed across your workspace.</Typography>
            </Box>
          </Box>

          <Button type="submit" variant="contained" disabled={saving} className="organization-profile__save">{saving ? "Saving…" : "Save Changes"}</Button>
        </>}
      </Box>
      <input ref={fileInputRef} className="organization-profile__file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = ""; }} />
    </main>

          <Button type="submit" variant="contained" disabled={saving} className="organization-profile__save">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </Box>
      </main>

      <input
        ref={fileInputRef}
        className="organization-profile__file-input"
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        onChange={(event) => selectImage(event.target.files?.[0])}
      />
      <canvas ref={canvasRef} className="organization-profile__camera-canvas" />

      <Dialog
        open={logoDialogOpen}
        onClose={closeLogoDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: "organization-logo-dialog" }}
      >
        <Box className="organization-logo-dialog__heading">
          <Typography component="h2">Add Organisation Logo</Typography>
          <Button iconOnly aria-label="Close logo options" onClick={closeLogoDialog}>
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
          <DialogContent className="organization-logo-dialog__options">
            <button
              type="button"
              className="organization-logo-option"
              onClick={() => {
                setSelectedLogo({ type: "preset", value: "OD" });
                closeLogoDialog();
              }}
            >
              <span className="organization-logo-option__icon"><AddPhotoAlternateOutlinedIcon /></span>
              <strong>ODRAOPS Gallery</strong>
              <span>Choose a logo from ODRAOPS</span>
            </button>
            <button type="button" className="organization-logo-option" onClick={() => fileInputRef.current?.click()}>
              <span className="organization-logo-option__icon"><ImageOutlinedIcon /></span>
              <strong>Choose from Gallery</strong>
              <span>Upload an image from your device</span>
            </button>
            <button type="button" className="organization-logo-option" onClick={openCameraCapture}>
              <span className="organization-logo-option__icon"><PhotoCameraOutlinedIcon /></span>
              <strong>Take Photo</strong>
              <span>Capture a new photo</span>
            </button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
