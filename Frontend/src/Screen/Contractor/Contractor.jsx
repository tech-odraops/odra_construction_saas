import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../../utils/axiosInstance";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import constructionBackground from "../../assets/construction_dashboard_background.png";
import StatusChips from "../../Components/atoms/StatusChips/StatusChips";
import Button from "../../Components/atoms/Button/Button";

export default function ContractorDashboard() {
  const [projects, setProjects] = useState({});
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const token = localStorage.getItem("token");
  const { t } = useTranslation();
  const decoded = token ? jwtDecode(token) : null;
  const contractorId = decoded?.User_id;

  useEffect(() => {
    if (!token) return;
    fetchProjects();
    socketRef.current = io(import.meta.env.VITE_API_URL, { transports: ["websocket"] });
    socketRef.current.emit("join", { contractorId });
    socketRef.current.on("report:new", (data) => {
      const reportId = data.newReport?._id || data.reportId;
      toast.info(`New report received: ${data.projectTitle}`, {
        onClick: () => reportId
          ? navigate(`/contractor/view-report/${reportId}`)
          : data.projectId && navigate(`/contractor/project/${data.projectId}`),
      });
    });
    return () => socketRef.current?.disconnect();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get("/projects/dashboard");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const stats = [
    { label: t("dashboard.contractor.total_projects"), value: projects.totalProjects ?? 0, Icon: BusinessRoundedIcon, color: "#f45b0b", tint: "#fff0e8" },
    { label: t("dashboard.contractor.ongoing_projects"), value: projects.ongoingProjects ?? 0, Icon: HandymanRoundedIcon, color: "#f5a000", tint: "#fff6e3" },
    { label: t("dashboard.contractor.completed_projects"), value: projects.completedProjects ?? 0, Icon: CheckCircleOutlineRoundedIcon, color: "#20a53a", tint: "#e9f7ec" },
  ];

  const hasProjects = Boolean(projects?.totalProjects || projects?.recentProjects?.length);

  return (
    <Box component="main" sx={{ minHeight: "100%", bgcolor: "var(--color-dashboard-surface)", p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ maxWidth: "var(--dashboard-content-max-width)", mx: "auto", backgroundImage: `url(${constructionBackground})`, backgroundRepeat: "no-repeat", backgroundPosition: "right top", backgroundSize: "auto 130px" }}>
              {!hasProjects ? (
                <Box sx={{ minHeight: "calc(100vh - 11rem)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2 }}>
                  <Box component="img" src={constructionBackground} alt="" sx={{ width: "min(100%, 34rem)", height: 150, objectFit: "cover", objectPosition: "center", opacity: .8, mb: 2 }} />
                  <Typography sx={{ fontSize: { xs: 25, md: 30 }, fontWeight: 750, color: "var(--palette-text-primary)", mb: .75 }}>No projects yet</Typography>
                  <Typography sx={{ maxWidth: 410, color: "var(--color-dashboard-muted-text)", fontSize: 12, lineHeight: 1.45, mb: 2.5 }}>
                    Create your first project and start managing your construction work in a simpler and smarter way.
                  </Typography>
                  <Button
                    icon="plus-math"
                    component={Link}
                    to="/contractor/add-project"
                    size="wide"
                  >
                    Create Your First Project
                  </Button>
                </Box>
              ) : (
                <>
              <Box sx={{ minHeight: 110, mb: 2 }}>
                <Typography sx={{ fontSize: { xs: 26, md: 32 }, lineHeight: 1.2, fontWeight: 750, letterSpacing: "-.5px" }}>
                  {t("dashboard.contractor.title").split(" ")[0]} <Box component="span" sx={{ color: "var(--palette-primary-main)" }}>{t("dashboard.contractor.title").split(" ").slice(1).join(" ")}</Box>
                </Typography>
                <Typography sx={{ color: "var(--color-dashboard-muted-text)", mt: 1, fontSize: 15 }}>{t("dashboard.contractor.subtitle")}</Typography>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
                {stats.map(({ label, value, Icon: StatIcon, color, tint }) => (
                  <Box key={label} sx={{ minHeight: 116, display: "flex", alignItems: "center", gap: 2, p: 2, bgcolor: "var(--color-dashboard-header-surface)", borderRadius: 2, border: "1px solid var(--color-dashboard-border)" }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: tint, display: "grid", placeItems: "center", flexShrink: 0 }}><Box component={StatIcon} sx={{ color, fontSize: 30 }} /></Box>
                    <Box><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{label}</Typography><Typography sx={{ color, fontWeight: 750, fontSize: 30, lineHeight: 1.15, mt: .5 }}>{value}</Typography></Box>
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
                <Button icon="plus-math" component={Link} to="/contractor/add-project" size="compact">{t("dashboard.contractor.add_project")}</Button>
                <Button component={Link} to="/contractor/project" size="compact">{t("dashboard.contractor.view_projects")}</Button>
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: 21, mb: 1.5 }}>{t("dashboard.contractor.view_projects")}</Typography>
              <Box sx={{ overflow: "hidden", border: "1px solid var(--color-dashboard-border)", borderRadius: 2, bgcolor: "var(--color-dashboard-header-surface)" }}>
                {projects?.recentProjects?.length ? projects.recentProjects.map((project) => (
                  <Box key={project._id} onClick={() => navigate(`/contractor/project/${project._id}`)} sx={{ minHeight: 70, px: 2, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid var(--color-dashboard-border)", cursor: "pointer", "&:last-child": { borderBottom: 0 }, "&:hover": { bgcolor: "var(--color-dashboard-nav-active)" } }}>
                    <Box sx={{ width: 42, height: 42, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)", borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}><BusinessRoundedIcon /></Box>
                    <Typography sx={{ fontWeight: 550, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</Typography>
                    <StatusChips label={project.status || t("project.ongoing")} status={project.status || "ongoing"} />
                  </Box>
                )) : <Typography sx={{ color: "var(--color-dashboard-muted-text)", p: 3 }}>{t("dashboard.contractor.no_projects")}</Typography>}
              </Box>
                </>
              )}
            </Box>
    </Box>
  );
}
