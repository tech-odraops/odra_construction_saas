import React, { useEffect, useState } from 'react'
import Footer from '../../Components/Footer';
import { useNavigate } from 'react-router-dom';
import SiteEngineerNavbar from '../../Components/SiteEngineerNavbar';
import axiosInstance from '../../utils/axiosInstance';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
import { useRef } from "react";
import CircularProgress from '@mui/material/CircularProgress';
import { toast } from 'react-toastify';
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useTranslation } from "react-i18next";
import Tooltip from "@mui/material/Tooltip";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "../../Components/atoms/Button/Button";
import FullScreenLoader from "../../Components/FullScreenLoader";
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

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { t } = useTranslation();

  if (!token) return;
  const decoded = jwtDecode(token);
  const siteEngineerId = decoded.User_id;


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/projects/my-projects");
        setProjects(res.data.projects); // Fix: Use res instead of fetchData
        setLoading(false);
      } catch (e) {
        setError("Error fetching projects.");
        console.log(e);
      }
    }
    fetchData();

    // socket connection
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    });

    if (!socketRef.current) return;
    socketRef.current.emit("join", {
      siteEngineerId
    });

    socketRef.current.on("project:assigned", (data) => {
      setProjects((prev) => [...prev, data.newProject])
      toast.info(`New project assigned: ${data.newProject.title} by ${data.contractorName}`, {
        onClick: () => {
          if (data.newProject?._id) {
            navigate(`/site-engineer/projects/${data.newProject._id}`);
          }
        }
      });
    })

    socketRef.current.on("project:deleted", (data) => {
      setProjects((prev) =>
        prev.filter((pro) => pro._id !== data.project_id)
      );

      toast.info(`Contractor deleted the project ${data.project_name}`);
    });

    socketRef.current.on("project:titleUpdated", (data) => {

      setProjects((prev) =>
        prev.map((project) =>
          project._id === data.projectId
            ? { ...project, title: data.title }
            : project
        )
      );

      toast.info("Title Updated");

    });


    return () => {
      if (socketRef.current) {
        socketRef.current.off("project:assigned");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, []);



  const formattedDate = (project) => {
    const date = project.createdAt || project.created_at || project.createdOn;
    if (!date) return "";
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
      ? ""
      : `Created on ${parsed.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`;
  };

  if (loading) return <FullScreenLoader />;

  return (
    <div className="projects-page">
      <SiteEngineerNavbar />
      <main className="projects-main">
        <header className="projects-header">
          <div>
            <Typography component="h1" className="projects-title">
              {t("project.my_projects")}
            </Typography>
            <Typography component="p" className="projects-subtitle">
              {t("project.track_projects")}
            </Typography>
          </div>
        </header>

        <Tabs
          className="projects-tabs"
          value={tab}
          onChange={(_event, newValue) => setTab(newValue)}
          aria-label="Project status filters"
        >
          <Tab label={t("project.all_projects")} />
          <Tab label={t("project.ongoing")} />
          <Tab label={t("project.completed")} />
        </Tabs>

        {error && (
          <Typography color="error" sx={{ mb: 3 }}>
            {error}
          </Typography>
        )}

        {projects.filter((project) => {
          if (tab === 1) return project.status === "Ongoing";
          if (tab === 2) return project.status === "Completed";
          return true;
        }).length ? (
          <section className="projects-grid">
            {projects
              .filter((project) => {
                if (tab === 1) return project.status === "Ongoing";
                if (tab === 2) return project.status === "Completed";
                return true;
              })
              .map((project) => (
                <article className="project-card" key={project._id} onClick={() => navigate(`/site-engineer/projects/${project._id}`)}>
                  <div className="project-card-icon"><ProjectBuildingIcon /></div>
                  <div className="project-card-copy">
                    <Typography component="h2" title={project.title || t("project.untitled_project")}>
                      {project.title || t("project.untitled_project")}
                    </Typography>
                    <span className="project-card-date">{formattedDate(project)}</span>
                    <StatusChips
                      label={project.status || t("project.ongoing")}
                      status={project.status || "ongoing"}
                    />
                  </div>
                  <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
                    <Tooltip title={t("project.open_project")}>
                      <Button iconOnly aria-label="Open project" onClick={() => navigate(`/site-engineer/projects/${project._id}`)}>
                          <ProjectEditIcon />
                        </Button>
                    </Tooltip>
                  </div>
                </article>
              ))}
          </section>
        ) : (
          <Typography className="projects-empty" sx={{ mt: 2 }}>
            {t("project.no_assigned_projects")}
          </Typography>
        )}
      </main>

      <Footer />
    </div>
  );
}
