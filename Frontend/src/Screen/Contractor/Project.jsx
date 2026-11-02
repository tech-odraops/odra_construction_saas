import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { Link, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography, Tabs, Tab, Tooltip } from "@mui/material";
import Button from "../../Components/atoms/Button/Button";
import { toast } from "react-toastify";
import AddIcon from "@mui/icons-material/Add";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import { useTranslation } from "react-i18next";
import StatusChips from "../../Components/atoms/StatusChips/StatusChips";

function ProjectBuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 21V3.5c0-.55.45-1 1-1h9c.55 0 1 .45 1 1V21M15 9h4c.55 0 1 .45 1 1v11M2.5 21h19" />
      <path d="M7 6h1M11 6h1M7 9h1M11 9h1M7 12h1M11 12h1M7 15h1M11 15h1M17 12h1M17 15h1M17 18h1" />
      <path d="M9.5 21v-3h2v3" />
    </svg>
  );
}

function ProjectEditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M13.5 5H5.25A1.25 1.25 0 0 0 4 6.25v12.5A1.25 1.25 0 0 0 5.25 20h12.5A1.25 1.25 0 0 0 19 18.75V11.5" />
      <path d="m10 14 1-3.2L18.7 3a1.55 1.55 0 0 1 2.2 2.2l-7.8 7.7L10 14Z" />
      <path d="M7 17h7" />
    </svg>
  );
}

export default function Project() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const { t } = useTranslation();

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get("/projects");
      if (res.status === 200) setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure? This will permanently delete the project.")) return;
    try {
      await axiosInstance.delete(`/projects/${projectId}`);
      toast.success("Project deleted");
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const visibleProjects = projects.filter((project) => {
    if (tab === 1) return project.status?.toLowerCase() === "ongoing";
    if (tab === 2) return project.status?.toLowerCase() === "completed";
    return true;
  });

  const formattedDate = (project) => {
    const date = project.createdAt || project.created_at || project.createdOn;
    if (!date) return "";
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : `Created on ${parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
  };

  return (
    <div className="projects-page">
      <main className="projects-main">
        <header className="projects-header">
          <div>
            <Typography component="h1" className="projects-title">{t("project.projects")}</Typography>
            <Typography component="p" className="projects-subtitle">{t("project.manage_projects")}</Typography>
          </div>
          <Button className="projects-add-button" component={Link} to="/contractor/add-project" startIcon={<AddIcon />}>
            Add New Project
          </Button>
        </header>

        <Tabs className="projects-tabs" value={tab} onChange={(_event, value) => setTab(value)} aria-label="Project status filters">
          <Tab label={t("project.all_projects")} />
          <Tab label={t("project.ongoing")} />
          <Tab label={t("project.completed")} />
        </Tabs>

        {loading ? (
          <Box className="projects-loading"><CircularProgress sx={{ color: "#F97316" }} /></Box>
        ) : visibleProjects.length ? (
          <section className="projects-grid">
            {visibleProjects.map((project) => (
              <article className="project-card" key={project._id} onClick={() => navigate(`/contractor/project/${project._id}`)}>
                <div className="project-card-icon"><ProjectBuildingIcon /></div>
                <div className="project-card-copy">
                  <Typography component="h2" title={project.title}>{project.title}</Typography>
                  <span className="project-card-date">{formattedDate(project)}</span>
                  <StatusChips
                    label={project.status || t("project.ongoing")}
                    status={project.status || "ongoing"}
                  />
                </div>
                <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
                  <Tooltip title={t("project.open_project")}>
                    <Button iconOnly aria-label="Open project" onClick={() => navigate(`/contractor/project/${project._id}`)}><ProjectEditIcon /></Button>
                  </Tooltip>
                  <Tooltip title="Delete Project">
                    <Button iconOnly aria-label="Delete project" className="project-delete-button" onClick={() => handleDelete(project._id)}><DeleteForeverRoundedIcon /></Button>
                  </Tooltip>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <Typography className="projects-empty">{t("project.no_projects")}</Typography>
        )}
      </main>
    </div>
  );
}
