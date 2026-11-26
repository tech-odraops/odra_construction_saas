import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectRole, selectUserId } from "../../redux/slices/authSlice";
import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Button from "../../Components/atoms/Button/Button";
import Input from "../../Components/atoms/Input/Input";
import usePopup from "../../contexts/usePopup";
import axiosInstance from "../../utils/axiosInstance";
import { deleteAsset, getAssets, uploadAsset } from "../../services/assetService";
import "./Gallery.css";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FILE_EXTENSIONS = [".pdf", ".xlsx", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_SIZE = 24;

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const getProjectId = (asset) =>
  typeof asset.projectId === "string" ? asset.projectId : asset.projectId?._id;

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : parsed.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
};

const formatSize = (sizeMB = 0) => {
  const size = Number(sizeMB);
  if (!Number.isFinite(size) || size < 0.01) return "<0.01 MB";
  return `${size.toFixed(2)} MB`;
};

const parseTags = (value) => [...new Set(
  value.split(",").map((tag) => tag.trim()).filter(Boolean),
)];

const isAllowedFile = (file, assetType) => {
  if (file.size > MAX_FILE_SIZE) return false;
  if (assetType === "image") return IMAGE_TYPES.includes(file.type);

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return FILE_EXTENSIONS.includes(extension);
};

export default function Gallery() {
  const { showPopup } = usePopup();
  const [tab, setTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const fileInputRef = useRef(null);
  const assetRequestRef = useRef(0);

  const assetType = tab === 0 ? "image" : "file";
  const role = useSelector(selectRole);
  const currentUserId = useSelector(selectUserId);
  const canDeleteAssets = role === "Founder";
  const notify = useCallback((title, message, variant = "error") => {
    showPopup({ title, message, variant });
  }, [showPopup]);
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project._id, project.title])),
    [projects],
  );
  const hasMore = assets.length < total;

  useEffect(() => {
    let active = true;

    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        let allProjects = [];

        if (role === "Site Engineer") {
          const { data } = await axiosInstance.get("/projects/my-projects");
          allProjects = data.projects || [];
        } else {
          let currentPage = 1;
          let projectTotal = Infinity;
          while (allProjects.length < projectTotal) {
            const { data } = await axiosInstance.get("/projects", {
              params: { page: currentPage, limit: 20, status: "all" },
            });
            const currentProjects = data.projects || [];
            allProjects = allProjects.concat(currentProjects);
            projectTotal = Number(data.total) || currentProjects.length;
            if (currentProjects.length === 0) break;
            currentPage += 1;
          }
        }

        if (active) {
          setProjects(allProjects);
          setUploadProjectId((current) => current || allProjects[0]?._id || "");
        }
      } catch (error) {
        if (active) notify("Unable to load projects", getErrorMessage(error, "Could not load projects."));
      } finally {
        if (active) setProjectsLoading(false);
      }
    };

    fetchProjects();
    return () => {
      active = false;
    };
  }, [notify, role]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = assetRequestRef.current + 1;
    assetRequestRef.current = requestId;
    let active = true;
    setLoading(true);
    setLoadingMore(false);
    setLoadError("");
    setAssets([]);
    setTotal(0);
    setPage(1);

    const fetchAssets = async () => {
      try {
        const data = await getAssets({
          assetType,
          projectId: projectFilter || undefined,
          search: debouncedSearch || undefined,
          page: 1,
          limit: PAGE_SIZE,
        }, { signal: controller.signal });
        if (!active || assetRequestRef.current !== requestId) return;
        setAssets(data.assets || []);
        setTotal(data.total || 0);
      } catch (error) {
        if (active && assetRequestRef.current === requestId && error.code !== "ERR_CANCELED") {
          const message = getErrorMessage(error, "Could not load assets.");
          setLoadError(message);
          notify("Unable to load assets", message);
        }
      } finally {
        if (active && assetRequestRef.current === requestId) setLoading(false);
      }
    };

    fetchAssets();
    return () => {
      active = false;
      controller.abort();
    };
  }, [assetType, projectFilter, debouncedSearch, refreshKey, notify]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const requestId = assetRequestRef.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await getAssets({
        assetType,
        projectId: projectFilter || undefined,
        search: debouncedSearch || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (assetRequestRef.current === requestId) {
        setAssets((current) => [...current, ...(data.assets || [])]);
        setPage(nextPage);
        setTotal(data.total || 0);
      }
    } catch (error) {
      if (assetRequestRef.current === requestId) {
        notify("Unable to load more assets", getErrorMessage(error, "Could not load more assets."));
      }
    } finally {
      if (assetRequestRef.current === requestId) setLoadingMore(false);
    }
  };

  const openUpload = () => {
    setUploadProjectId(projectFilter || projects[0]?._id || "");
    setSelectedFiles([]);
    setTagsInput("");
    setUploadOpen(true);
  };

  const chooseFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const validFiles = files.filter((file) => isAllowedFile(file, assetType));
    if (validFiles.length !== files.length) {
      notify("Unsupported file", assetType === "image"
        ? "Choose JPG, PNG, or WEBP images up to 10 MB each."
        : "Choose PDF, XLSX, DOCX, TXT, or MD files up to 10 MB each.");
    }
    setSelectedFiles(validFiles);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadProjectId) {
      notify("Choose a project", "Select a project before uploading assets.");
      return;
    }
    if (!selectedFiles.length) {
      notify("Choose a file", `Choose at least one ${assetType === "image" ? "image" : "file"}.`);
      return;
    }

    const tags = parseTags(tagsInput);
    if (tags.length > 20 || tags.some((tag) => tag.length > 50)) {
      notify("Check the tags", "Use up to 20 tags, each no longer than 50 characters.");
      return;
    }

    setUploading(true);
    let uploaded = 0;
    let failure = null;
    for (const [index, file] of selectedFiles.entries()) {
      setUploadProgress(`Uploading ${index + 1} of ${selectedFiles.length}...`);
      try {
        await uploadAsset({ file, projectId: uploadProjectId, tags, assetType });
        uploaded += 1;
      } catch (error) {
        failure = error;
        break;
      }
    }

    setUploading(false);
    setUploadProgress("");
    if (uploaded) {
      setUploadOpen(false);
      setRefreshKey((current) => current + 1);
      if (failure) {
        notify("Some assets were not uploaded", `Uploaded ${uploaded} of ${selectedFiles.length}. ${getErrorMessage(failure, "One upload failed.")}`);
      } else {
        notify("Upload complete", `${uploaded} ${assetType === "image" ? "image(s)" : "file(s)"} uploaded.`, "success");
      }
    } else if (failure) {
      notify("Upload failed", getErrorMessage(failure, "Could not upload assets."));
    }
  };

  const removeAsset = async (event, asset) => {
    event.stopPropagation();
    if (!window.confirm(`Delete "${asset.originalName || "this asset"}"?`)) return;
    try {
      await deleteAsset(asset.assetId);
      setRefreshKey((current) => current + 1);
      if (previewAsset?.assetId === asset.assetId) setPreviewAsset(null);
      notify("Asset deleted", "The asset was removed successfully.", "success");
    } catch (error) {
      notify("Could not delete asset", getErrorMessage(error, "Could not delete the asset."));
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (!event.dataTransfer.files.length) return;
    openUpload();
    chooseFiles(event.dataTransfer.files);
  };

  const fileAccept = assetType === "image"
    ? "image/jpeg,image/png,image/webp"
    : ".pdf,.xlsx,.docx,.txt,.md";

  return (
    <div className="gallery-page">
      <header className="gallery-heading">
        <div>
          <Typography component="h1" className="gallery-title">
            ODRA<span>OPS</span> Assets
          </Typography>
          <Typography component="p" className="gallery-subtitle">
            Manage all project images and documents in one place.
          </Typography>
        </div>
        <Button
          variant="contained"
          className="gallery-primary-action"
          startIcon={<CloudUploadOutlinedIcon />}
          onClick={openUpload}
          disabled={projectsLoading || projects.length === 0}
        >
          Upload
        </Button>
      </header>

      <Tabs
        className="gallery-tabs"
        value={tab}
        onChange={(_event, value) => setTab(value)}
        aria-label="Asset type"
      >
        <Tab icon={<ImageOutlinedIcon />} iconPosition="start" label="Images" />
        <Tab icon={<ArticleOutlinedIcon />} iconPosition="start" label="Files" />
      </Tabs>

      <section
        className={`gallery-panel${dragging ? " gallery-panel--dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className="gallery-panel-heading">
          <div className="gallery-panel-title-wrap">
            {assetType === "image" ? <ImageOutlinedIcon /> : <ArticleOutlinedIcon />}
            <div>
              <Typography component="h2" className="gallery-panel-title">
                {assetType === "image" ? "Project Images" : "Project Files"}
              </Typography>
              <Typography component="p" className="gallery-item-count">
                {total} {assetType === "image" ? "Images" : "Files"}
              </Typography>
            </div>
          </div>

          <div className="gallery-controls">
            <Input
              className="gallery-search-input"
              size="md"
              icon="search"
              placeholder={`Search ${assetType === "image" ? "images" : "files"}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={`Search ${assetType}s`}
            />
            <Input
              className="gallery-filter"
              select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              aria-label="Filter assets by project"
              size="sm"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option value={project._id} key={project._id}>
                  {project.title}
                </option>
              ))}
            </Input>
          </div>
        </div>

        {loading ? (
          <div className="gallery-empty-state" aria-label="Loading assets">
            <CircularProgress size="2rem" />
          </div>
        ) : loadError ? (
          <div className="gallery-empty-state" role="alert">
            <Typography component="h3" className="gallery-empty-title">
              Could not load {assetType === "image" ? "images" : "files"}
            </Typography>
            <Typography component="p" className="gallery-empty-description">
              {loadError}
            </Typography>
            <Button
              variant="outlined"
              className="gallery-secondary-action"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Retry
            </Button>
          </div>
        ) : assets.length ? (
          assetType === "image" ? (
            <div className="gallery-image-grid">
              {assets.map((asset) => (
                <div className="gallery-image-card" key={asset.assetId}>
                  <button
                    type="button"
                    className="gallery-image-open"
                    aria-label={`Preview ${asset.originalName || "image"}`}
                    onClick={() => setPreviewAsset(asset)}
                  >
                    <img
                      src={asset.thumbnailUrl || asset.imageUrl}
                      alt={asset.originalName || "Project asset"}
                      loading="lazy"
                    />
                  </button>
                  <div className="gallery-image-overlay">
                    <Typography title={asset.originalName}>
                      {asset.originalName || projectNames.get(getProjectId(asset)) || "Project image"}
                    </Typography>
                    {(canDeleteAssets || asset.uploaderId === currentUserId) && (
                    <Tooltip title="Delete image">
                      <IconButton
                        size="small"
                        aria-label="Delete image"
                        onClick={(event) => removeAsset(event, asset)}
                        className="gallery-image-delete"
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="gallery-upload-tile" onClick={openUpload}>
                <AddPhotoAlternateOutlinedIcon />
                <strong>Upload Images</strong>
                <span>JPG, PNG, WEBP (Up to 10MB)</span>
              </button>
            </div>
          ) : (
            <div className="gallery-file-table-wrap">
              <table className="gallery-file-table">
                <thead>
                  <tr>
                    <th aria-label="File" />
                    <th>Name</th>
                    <th>Project</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.assetId}>
                      <td><ArticleOutlinedIcon fontSize="small" /></td>
                      <td>
                        <div className="gallery-file-name">
                          <span title={asset.originalName}>{asset.originalName || "Project file"}</span>
                        </div>
                      </td>
                      <td>{projectNames.get(getProjectId(asset)) || "Project"}</td>
                      <td><span className="gallery-file-type">{asset.fileType?.toUpperCase()}</span></td>
                      <td>{formatSize(asset.sizeMB)}</td>
                      <td>{formatDate(asset.uploadedOn)}</td>
                      <td>
                        <div className="gallery-file-actions">
                          <Tooltip title="Download file">
                            <IconButton
                              component="a"
                              href={asset.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              size="small"
                              aria-label={`Download ${asset.originalName || "file"}`}
                            >
                              <DownloadOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {(canDeleteAssets || asset.uploaderId === currentUserId) && (
                            <Tooltip title="Delete file">
                              <IconButton
                                size="small"
                                aria-label={`Delete ${asset.originalName || "file"}`}
                                onClick={(event) => removeAsset(event, asset)}
                              >
                                <DeleteOutlineOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="gallery-empty-state">
            <div className="gallery-empty-icon">
              {assetType === "image" ? <AddPhotoAlternateOutlinedIcon /> : <FolderOpenOutlinedIcon />}
            </div>
            <Typography component="h3" className="gallery-empty-title">
              {debouncedSearch
                ? `No ${assetType === "image" ? "images" : "files"} found`
                : `No ${assetType === "image" ? "images" : "files"} yet`}
            </Typography>
            <Typography component="p" className="gallery-empty-description">
              {debouncedSearch
                ? "Try another search or project filter."
                : `Upload ${assetType === "image" ? "project images" : "project files"} to keep everything organized.`}
            </Typography>
            {!debouncedSearch && (
              <Button
                variant="contained"
                className="gallery-primary-action"
                startIcon={<CloudUploadOutlinedIcon />}
                onClick={openUpload}
                disabled={projectsLoading || projects.length === 0}
              >
                Upload {assetType === "image" ? "Images" : "Files"}
              </Button>
            )}
          </div>
        )}

        {hasMore && !loading && (
          <div className="gallery-load-more">
            <Button
              variant="outlined"
              className="gallery-secondary-action"
              onClick={loadMore}
              disabled={loadingMore}
              startIcon={loadingMore ? <CircularProgress size="1rem" /> : null}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </section>

      <Dialog
        open={uploadOpen}
        onClose={() => !uploading && setUploadOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleUpload}>
          <DialogTitle className="gallery-dialog-title">
            Upload {assetType === "image" ? "images" : "files"}
            <IconButton
              aria-label="Close upload dialog"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
            >
              <CloseOutlinedIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent className="gallery-dialog-content">
            <Input
              className="gallery-dialog-input"
              label="Project"
              select
              value={uploadProjectId}
              onChange={(event) => setUploadProjectId(event.target.value)}
              disabled={uploading || projectsLoading}
              required
            >
              <option value="" disabled>Select a project</option>
              {projects.map((project) => (
                <option value={project._id} key={project._id}>
                  {project.title}
                </option>
              ))}
            </Input>

            <Input
              className="gallery-dialog-input"
              label="Tags (comma-separated)"
              placeholder="e.g. foundation, site progress"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              disabled={uploading}
            />

            <input
              ref={fileInputRef}
              className="gallery-file-input"
              type="file"
              accept={fileAccept}
              multiple
              onChange={(event) => {
                chooseFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="gallery-dialog-file-picker"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <CloudUploadOutlinedIcon />
              <span>{selectedFiles.length
                ? `${selectedFiles.length} file(s) selected`
                : `Choose ${assetType === "image" ? "images" : "files"}`}</span>
              <small>Maximum 10 MB per file</small>
            </button>

            {selectedFiles.length > 0 && (
              <div className="gallery-selected-files">
                {selectedFiles.map((file, index) => (
                  <Typography key={`${file.name}-${index}`} component="div">
                    {file.name} <span>{formatSize(file.size / (1024 * 1024))}</span>
                  </Typography>
                ))}
              </div>
            )}
            {uploadProgress && (
              <Typography className="gallery-upload-progress" role="status">
                {uploadProgress}
              </Typography>
            )}
          </DialogContent>
          <DialogActions className="gallery-dialog-actions">
            <Button onClick={() => setUploadOpen(false)} disabled={uploading} variant="primary">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              className="gallery-primary-action"
              disabled={uploading || projectsLoading}
              state={uploading ? "running" : undefined}
              startIcon={!uploading && <CloudUploadOutlinedIcon />}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        maxWidth="lg"
        fullWidth
      >
        {previewAsset && (
          <>
            <DialogTitle className="gallery-dialog-title">
              {previewAsset.originalName || "Project image"}
              <IconButton aria-label="Close image preview" onClick={() => setPreviewAsset(null)}>
                <CloseOutlinedIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent className="gallery-preview-content">
              <img
                className="gallery-preview-image"
                src={previewAsset.imageUrl}
                alt={previewAsset.originalName || "Project image"}
              />
              <Typography className="gallery-preview-meta">
                {projectNames.get(getProjectId(previewAsset)) || "Project"} - {formatDate(previewAsset.uploadedOn)}
              </Typography>
              {previewAsset.tags?.length > 0 && (
                <Typography className="gallery-preview-meta">
                  Tags: {previewAsset.tags.join(", ")}
                </Typography>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}
