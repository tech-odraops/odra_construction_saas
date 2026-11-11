import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import Button from "../../Components/atoms/Button/Button";
import Input from "../../Components/atoms/Input/Input";
import "./Gallery.css";

const imageTypeOptions = ["All Images", "JPG", "PNG", "WEBP", "GIF"];
const fileTypeOptions = ["All Files", "PDF", "DOCX", "XLSX", "Other"];

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file) {
  return file.type.startsWith("image/");
}

function getFileType(file) {
  const extension = getExtension(file.name);
  if (extension === "jpeg") return "JPG";
  return extension ? extension.toUpperCase() : "FILE";
}

function GalleryEmptyState({ imageTab, onUpload }) {
  const EmptyIcon = imageTab ? AddPhotoAlternateOutlinedIcon : DescriptionOutlinedIcon;

  return (
    <Box className="gallery-empty-state">
      <Box className="gallery-empty-icon">
        <EmptyIcon />
      </Box>
      <Typography component="h3" className="gallery-empty-title">
        {imageTab ? "No project images yet" : "No project files yet"}
      </Typography>
      <Typography className="gallery-empty-description">
        {imageTab
          ? "Upload site photos to keep your project progress in one place."
          : "Upload plans, reports, and other documents for your projects."}
      </Typography>
      <Button
        variant="contained"
        size="compact"
        startIcon={<CloudUploadOutlinedIcon />}
        onClick={onUpload}
      >
        Upload {imageTab ? "images" : "files"}
      </Button>
    </Box>
  );
}

export default function Gallery() {
  const [activeTab, setActiveTab] = useState("images");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Images");
  const [uploads, setUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const images = useMemo(
    () => uploads.filter(({ file }) => isImage(file)),
    [uploads]
  );
  const files = useMemo(
    () => uploads.filter(({ file }) => !isImage(file)),
    [uploads]
  );
  const displayedItems = activeTab === "images" ? images : files;
  const filteredItems = displayedItems.filter(({ file }) => {
    const matchesSearch = file.name.toLowerCase().includes(search.trim().toLowerCase());
    const type = getFileType(file);
    const matchesType = typeFilter === "All Images" || typeFilter === "All Files"
      ? true
      : typeFilter === "Other"
        ? !["PDF", "DOCX", "XLSX"].includes(type)
        : type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openFilePicker = () => fileInputRef.current?.click();

  const addFiles = (selectedFiles) => {
    const newUploads = Array.from(selectedFiles).map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        url,
        uploadedAt: new Date(),
      };
    });

    if (newUploads.length) {
      setUploads((current) => [...newUploads, ...current]);
    }
  };

  const handleFileSelection = (event) => {
    addFiles(event.target.files || []);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files || []);
  };

  const removeUpload = (upload) => {
    URL.revokeObjectURL(upload.url);
    objectUrlsRef.current.delete(upload.url);
    setUploads((current) => current.filter(({ id }) => id !== upload.id));
  };

  const handleTabChange = (_event, nextTab) => {
    setActiveTab(nextTab);
    setSearch("");
    setTypeFilter(nextTab === "images" ? "All Images" : "All Files");
  };

  const typeOptions = activeTab === "images" ? imageTypeOptions : fileTypeOptions;

  return (
    <Box className="gallery-page">
      <Box className="gallery-heading">
        <Box>
          <Typography component="h1" className="gallery-title">
            ODRAOPS <span>Gallery</span>
          </Typography>
          <Typography className="gallery-subtitle">
            Manage project images and documents in one place.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="compact"
          startIcon={<CloudUploadOutlinedIcon />}
          onClick={openFilePicker}
        >
          Upload
        </Button>
        <input
          ref={fileInputRef}
          className="gallery-file-input"
          type="file"
          multiple
          accept={activeTab === "images" ? "image/*" : undefined}
          onChange={handleFileSelection}
          aria-label={`Upload ${activeTab === "images" ? "images" : "files"}`}
        />
      </Box>

      <Tabs
        className="gallery-tabs"
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Gallery content type"
      >
        <Tab
          value="images"
          label="Images"
          icon={<ImageOutlinedIcon />}
          iconPosition="start"
        />
        <Tab
          value="files"
          label="Files"
          icon={<DescriptionOutlinedIcon />}
          iconPosition="start"
        />
      </Tabs>

      <Box
        className={`gallery-panel${isDragging ? " gallery-panel--dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <Box className="gallery-panel-heading">
          <Box className="gallery-panel-title-wrap">
            {activeTab === "images" ? <ImageOutlinedIcon /> : <DescriptionOutlinedIcon />}
            <Box>
              <Typography component="h2" className="gallery-panel-title">
                Project {activeTab === "images" ? "Images" : "Files"}
              </Typography>
              <Typography className="gallery-item-count">
                {displayedItems.length} {activeTab === "images" ? "images" : "files"}
              </Typography>
            </Box>
          </Box>
          <Box className="gallery-controls">
            <Box className="gallery-search">
              <Input
                size="compact"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${activeTab}...`}
                aria-label={`Search ${activeTab}`}
              />
            </Box>
            <Box className="gallery-filter">
              <Input
                size="compact"
                select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                aria-label={`Filter ${activeTab} by type`}
              >
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Input>
            </Box>
          </Box>
        </Box>

        {filteredItems.length === 0 ? (
          displayedItems.length === 0 ? (
            <GalleryEmptyState imageTab={activeTab === "images"} onUpload={openFilePicker} />
          ) : (
            <Box className="gallery-no-results">
              <Typography>No matching {activeTab} found.</Typography>
            </Box>
          )
        ) : activeTab === "images" ? (
          <Box className="gallery-image-grid">
            {filteredItems.map((upload) => (
              <Box className="gallery-image-card" key={upload.id}>
                <img src={upload.url} alt={upload.file.name} />
                <Box className="gallery-image-overlay">
                  <Typography title={upload.file.name}>{upload.file.name}</Typography>
                  <Button
                    iconOnly
                    border={false}
                    aria-label={`Remove ${upload.file.name}`}
                    onClick={() => removeUpload(upload)}
                  >
                    <DeleteOutlineOutlinedIcon />
                  </Button>
                </Box>
              </Box>
            ))}
            <Button
              variant="outlined"
              size="compact"
              startIcon={<AddPhotoAlternateOutlinedIcon />}
              onClick={openFilePicker}
            >
              Upload images
            </Button>
          </Box>
        ) : (
          <Box className="gallery-file-table-wrap">
            <table className="gallery-file-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all files" disabled /></th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((upload) => (
                  <tr key={upload.id}>
                    <td><input type="checkbox" aria-label={`Select ${upload.file.name}`} /></td>
                    <td>
                      <Box className="gallery-file-name">
                        <DescriptionOutlinedIcon />
                        <span title={upload.file.name}>{upload.file.name}</span>
                      </Box>
                    </td>
                    <td><span className="gallery-file-type">{getFileType(upload.file)}</span></td>
                    <td>{formatFileSize(upload.file.size)}</td>
                    <td>{upload.uploadedAt.toLocaleDateString()}</td>
                    <td>
                      <Box className="gallery-file-actions">
                        <Button
                          iconOnly
                          border={false}
                          component="a"
                          href={upload.url}
                          download={upload.file.name}
                          aria-label={`Download ${upload.file.name}`}
                        >
                          <DownloadOutlinedIcon />
                        </Button>
                        <Button
                          iconOnly
                          border={false}
                          aria-label={`Remove ${upload.file.name}`}
                          onClick={() => removeUpload(upload)}
                        >
                          <DeleteOutlineOutlinedIcon />
                        </Button>
                      </Box>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
    </Box>
  );
}
