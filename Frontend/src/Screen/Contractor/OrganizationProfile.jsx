import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
} from "@mui/material";
import Button from "../../Components/atoms/Button/Button";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import usePopup from "../../contexts/usePopup";
import "./OrganizationProfile.css";
import Input from "../../Components/atoms/Input/Input";

const ORGANIZATION_LOGO_KEY = "organizationLogo";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function OrganizationProfile() {
  const navigate = useNavigate();
  const { showPopup } = usePopup();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
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
  const [saving, setSaving] = useState(false);

  const logo = selectedLogo || savedLogo;

  function selectImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showPopup({ variant: "error", title: "Unsupported file", message: "Choose an image file for your organization logo." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showPopup({ variant: "error", title: "Image too large", message: "Choose an image smaller than 2MB so it fits in browser storage." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedLogo({ type: "image", value: reader.result });
      setLogoDialogOpen(false);
    };
    reader.onerror = () => {
      showPopup({ variant: "error", title: "Upload failed", message: "Could not read this image. Please try another file." });
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(event) {
    event.preventDefault();
    const trimmedName = organizationName.trim();
    if (!trimmedName) {
      showPopup({ variant: "error", title: "Organization name required", message: "Enter an organization name before saving." });
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem("organizationName", trimmedName);
      if (selectedLogo) {
        localStorage.setItem(ORGANIZATION_LOGO_KEY, JSON.stringify(selectedLogo));
        setSavedLogo(selectedLogo);
        setSelectedLogo(null);
      }
      setOrganizationName(trimmedName);
      showPopup({ variant: "success", title: "Changes saved", message: "Your organization profile has been updated." });
    } catch {
      showPopup({ variant: "error", title: "Save failed", message: "Could not save the profile in browser storage. Please try a smaller image." });
    } finally {
      setSaving(false);
    }
  }

  function renderLogoContent() {
    if (logo?.type === "image") {
      return <img className="organization-profile__logo-image" src={logo.value} alt="Organization logo preview" />;
    }
    if (logo?.type === "preset") {
      return <span className="organization-profile__preset-mark">{logo.value}</span>;
    }
    return (
      <span className="organization-profile__upload-mark">
        <ImageRoundedIcon className="organization-profile__upload-icon" />
        <AddRoundedIcon className="organization-profile__upload-plus" />
      </span>
    );
  }

  return (
    <>
      <main className="organization-profile">
        <Box className="organization-profile__heading">
          <Button
            iconOnly
            aria-label="Back to dashboard"
            onClick={() => navigate(-1)}
            className="organization-profile__back"
          >
            <ArrowBackRoundedIcon />
          </Button>
          <Box>
            <Typography component="h1">Organisation Profile</Typography>
            <Typography component="p">
              Update your organisation details and logo. This information will be used across your reports and projects.
            </Typography>
          </Box>
        </Box>

        <Box component="form" className="organization-profile__form" onSubmit={handleSave}>
          <Box className="organization-profile__details">
            <button
              className="organization-profile__logo-picker"
              type="button"
              onClick={() => setLogoDialogOpen(true)}
              aria-label="Upload organization logo"
            >
              <span className="organization-profile__logo-circle">{renderLogoContent()}</span>
              <span className="organization-profile__logo-add"><AddRoundedIcon /></span>
              <span className="organization-profile__logo-title">Upload Organisation Logo</span>
              <span className="organization-profile__logo-hint">PNG, JPG or SVG (Max 2MB)</span>
            </button>

            <Box className="organization-profile__fields">
              <label htmlFor="organization-name">Organisation Name</label>
              <Input
                id="organization-name"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                label="Organisation Name"
                placeholder="Enter organisation name"
                maxLength={120}
              />
              <Typography component="p">This name will be displayed across your workspace.</Typography>
            </Box>
          </Box>

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
      <input
        ref={cameraInputRef}
        className="organization-profile__file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => selectImage(event.target.files?.[0])}
      />

      <Dialog
        open={logoDialogOpen}
        onClose={() => setLogoDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: "organization-logo-dialog" }}
      >
        <Box className="organization-logo-dialog__heading">
          <Typography component="h2">Add Organisation Logo</Typography>
          <Button iconOnly aria-label="Close logo options" onClick={() => setLogoDialogOpen(false)}>
            <CloseRoundedIcon />
          </Button>
        </Box>
        <DialogContent className="organization-logo-dialog__options">
          <button
            type="button"
            className="organization-logo-option"
            onClick={() => {
              setSelectedLogo({ type: "preset", value: "OD" });
              setLogoDialogOpen(false);
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
          <button type="button" className="organization-logo-option" onClick={() => cameraInputRef.current?.click()}>
            <span className="organization-logo-option__icon"><PhotoCameraOutlinedIcon /></span>
            <strong>Take Photo</strong>
            <span>Capture a new photo</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
