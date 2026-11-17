import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import constructionBackground from "../assets/construction_dashboard_background.png";
import axiosInstance from "../utils/axiosInstance";
import StatusChips from "../Components/atoms/StatusChips/StatusChips";
import Button from "../Components/atoms/Button/Button";
import { DashboardStatsSkeleton, RecentProjectsSkeleton } from "../Components/DashboardSkeleton";
import { createAuthenticatedSocket } from "../utils/socket";

export default function Dashboard() {
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const isSiteEngineer = role === "Site Engineer";
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const expectedRole = pathname.startsWith("/site-engineer") ? "Site Engineer" : "Founder";
    if (!token || !["Founder", "Site Engineer"].includes(storedRole) || storedRole !== expectedRole) {
      const requestedPath = `${pathname}${window.location.search}${window.location.hash}`;
      navigate(`/Login?redirect=${encodeURIComponent(requestedPath)}`, { replace: true });
      return;
    }
    setRole(storedRole);
  }, [navigate, pathname, token]);

  const paths = isSiteEngineer
    ? { endpoint: "/projects/site-engineer/dashboard", projects: "/site-engineer/projects" }
    : { endpoint: "/projects/dashboard", projects: "/founder/project" };

  useEffect(() => {
    if (!token || !["Founder", "Site Engineer"].includes(role)) return undefined;
    axiosInstance.get(paths.endpoint)
      .then(({ data }) => setDashboard(data))
      .catch((error) => console.error("Unable to load dashboard:", error))
      .finally(() => setLoading(false));

    socketRef.current = createAuthenticatedSocket();
    if (!socketRef.current) return undefined;

    if (isSiteEngineer) {
      const handleProjectAssigned = (data) => {
        toast.info(`New project assigned: ${data.newProject.title}`, {
          onClick: () => data.newProject?._id && navigate(`/site-engineer/projects/${data.newProject._id}`),
        });
      };
      socketRef.current.on("project:assigned", handleProjectAssigned);
      return () => {
        socketRef.current?.off("project:assigned", handleProjectAssigned);
        socketRef.current?.disconnect();
        socketRef.current = null;
      };
    } else {
      const handleNewReport = (data) => {
        const reportId = data.newReport?._id || data.reportId;
        toast.info(`New report received: ${data.projectTitle}`, {
          onClick: () => reportId
            ? navigate(`/founder/view-report/${reportId}`)
            : data.projectId && navigate(`/founder/project/${data.projectId}`),
        });
      };
      socketRef.current.on("report:new", handleNewReport);
      return () => {
        socketRef.current?.off("report:new", handleNewReport);
        socketRef.current?.disconnect();
        socketRef.current = null;
      };
    }
  }, [isSiteEngineer, navigate, paths.endpoint, role, token]);

  if (!token || !["Founder", "Site Engineer"].includes(role)) return null;

  const translate = (key) => t(`dashboard.${isSiteEngineer ? "engineer" : "contractor"}.${key}`);
  const stats = [
    { label: translate("total_projects"), value: dashboard.totalProjects ?? 0, Icon: BusinessRoundedIcon, color: "#f45b0b", tint: "#fff0e8" },
    { label: translate("ongoing_projects"), value: dashboard.ongoingProjects ?? 0, Icon: HandymanRoundedIcon, color: "#f5a000", tint: "#fff6e3" },
    { label: translate("completed_projects"), value: dashboard.completedProjects ?? 0, Icon: CheckCircleOutlineRoundedIcon, color: "#20a53a", tint: "#e9f7ec" },
  ];
  const hasProjects = Boolean(dashboard?.totalProjects || dashboard?.recentProjects?.length);
  const title = isSiteEngineer ? "Site Engineer Dashboard" : "Founder Dashboard";
  const titleParts = title.split(" ");

  const recentProjects = dashboard?.recentProjects?.length ? dashboard.recentProjects : [];
  const recentProjectsContent = loading ? <RecentProjectsSkeleton /> : (
    <Box sx={{ overflow: "hidden", border: "1px solid var(--color-dashboard-border)", borderRadius: 2, bgcolor: "var(--color-dashboard-header-surface)" }}>
      {recentProjects.length ? recentProjects.map((project) => (
        <Box key={project._id} onClick={() => navigate(`${paths.projects}/${project._id}`)} sx={{ minHeight: 70, px: 2, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid var(--color-dashboard-border)", cursor: "pointer", "&:last-child": { borderBottom: 0 }, "&:hover": { bgcolor: "var(--color-dashboard-nav-active)" } }}>
          <Box sx={{ width: 42, height: 42, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}><BusinessRoundedIcon /></Box>
          <Typography sx={{ fontWeight: 550, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</Typography>
          <StatusChips label={project.status || t("project.ongoing")} status={project.status || "ongoing"} />
        </Box>
      )) : <Typography sx={{ color: "var(--color-dashboard-muted-text)", p: 3 }}>{translate("no_projects")}</Typography>}
    </Box>
  );

  return (
    <Box component="main" sx={{ minHeight: "100%", bgcolor: "var(--color-dashboard-surface)", p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ maxWidth: "var(--dashboard-content-max-width)", mx: "auto", backgroundImage: `url(${constructionBackground})`, backgroundRepeat: "no-repeat", backgroundPosition: "right top", backgroundSize: "auto 130px" }}>
        <Box sx={{ minHeight: 110, mb: 2 }}>
          <Typography sx={{ fontSize: { xs: 26, md: 32 }, lineHeight: 1.2, fontWeight: 750, letterSpacing: "-.5px" }}>
            {titleParts[0]} <Box component="span" sx={{ color: "var(--palette-primary-main)" }}>{titleParts.slice(1).join(" ")}</Box>
          </Typography>
          <Typography sx={{ color: "var(--color-dashboard-muted-text)", mt: 1, fontSize: 15 }}>{translate("subtitle")}</Typography>
        </Box>

        {loading ? (
          <DashboardStatsSkeleton stats={stats} />
        ) : !isSiteEngineer && !hasProjects ? (
          <Box sx={{ minHeight: "calc(100vh - 11rem)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2 }}>
            <Box component="img" src={constructionBackground} alt="" sx={{ width: "min(100%, 34rem)", height: 150, objectFit: "cover", objectPosition: "center", opacity: .8, mb: 2 }} />
            <Typography sx={{ fontSize: { xs: 25, md: 30 }, fontWeight: 750, color: "var(--palette-text-primary)", mb: .75 }}>No projects yet</Typography>
            <Typography sx={{ maxWidth: 410, color: "var(--color-dashboard-muted-text)", fontSize: 12, lineHeight: 1.45, mb: 2.5 }}>
              Create your first project and start managing your construction work in a simpler and smarter way.
            </Typography>
            <Button icon="plus-math" component={Link} to="/founder/add-project" size="wide">Create Your First Project</Button>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
              {stats.map(({ label, value, Icon: StatIcon, color, tint }) => (
                <Box key={label} sx={{ minHeight: 116, display: "flex", alignItems: "center", gap: 2, p: 2, bgcolor: "var(--color-dashboard-header-surface)", borderRadius: 2, border: "1px solid var(--color-dashboard-border)" }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: tint, display: "grid", placeItems: "center", flexShrink: 0 }}><Box component={StatIcon} sx={{ color, fontSize: 30 }} /></Box>
                  <Box><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{label}</Typography><Typography sx={{ color, fontWeight: 750, fontSize: 30, lineHeight: 1.15, mt: .5 }}>{value}</Typography></Box>
                </Box>
              ))}
            </Box>
          </>
        )}

        {(loading || isSiteEngineer || hasProjects) && (
          <>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
              {!isSiteEngineer && <Button icon="plus-math" component={Link} to="/founder/add-project" size="compact">{translate("add_project")}</Button>}
              <Button component={Link} to={paths.projects} size="compact">{translate("view_projects")}</Button>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 21, mb: 1.5 }}>{translate(isSiteEngineer ? "recent_projects" : "view_projects")}</Typography>
            {recentProjectsContent}
          </>
        )}
      </Box>
    </Box>
  );
}
