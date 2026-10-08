import React, { useEffect, useRef, useState } from "react";
import ContractorNavbar from "../../Components/ContractorNavbar";
import Footer from "../../Components/Footer";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../../utils/axiosInstance";
import { Box, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import constructionBackground from "../../assets/construction_dashboard_background.png";

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

  return (
    <>
      <ContractorNavbar />
      <Box sx={{ minHeight: "100vh", bgcolor: "#fff", color: "#17212e", pb: 5 }}>
        <Box sx={{ maxWidth: 1160, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 4, md: 5 }, pb: 2,
          backgroundImage: `url(${constructionBackground})`, backgroundRepeat: "no-repeat", backgroundPosition: "right 21px", backgroundSize: "auto 130px" }}>
          <Box sx={{ position: "relative", minHeight: 110, mb: 2 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 32 }, lineHeight: 1.2, fontWeight: 750, letterSpacing: "-.5px" }}>
              {t("dashboard.contractor.title").split(" ")[0]} <Box component="span" sx={{ color: "#f45b0b" }}>{t("dashboard.contractor.title").split(" ").slice(1).join(" ")}</Box>
            </Typography>
            <Typography sx={{ color: "#667085", mt: 1, fontSize: 15 }}>{t("dashboard.contractor.subtitle")}</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 2.5 }}>
            {stats.map(({ label, value, Icon, color, tint }) => (
              <Box key={label} sx={{ minHeight: 116, display: "flex", alignItems: "center", gap: 2.5, p: 2.5, bgcolor: "rgba(255,255,255,.94)", borderRadius: 3, boxShadow: "0 5px 20px rgba(25,35,45,.10)", border: "1px solid #f2f2f2" }}>
                <Box sx={{ width: 64, height: 64, borderRadius: 2.5, bgcolor: tint, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon sx={{ color, fontSize: 38 }} /></Box>
                <Box><Typography sx={{ fontWeight: 600, fontSize: 14, color: "#202a36" }}>{label}</Typography><Typography sx={{ color, fontWeight: 750, fontSize: 34, lineHeight: 1.15, mt: .5 }}>{value}</Typography></Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ maxWidth: 1160, mx: "auto", px: { xs: 2, sm: 3 }, pt: 1 }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2.2 }}>
            <Button component={Link} to="/contractor/add-project" variant="contained" startIcon={<AddCircleRoundedIcon />} sx={{ bgcolor: "#ff5b0a", px: 2.5, py: 1.25, borderRadius: 1.5, fontWeight: 650, boxShadow: "none", "&:hover": { bgcolor: "#e94c00", boxShadow: "none" } }}>{t("dashboard.contractor.add_project")}</Button>
            <Button component={Link} to="/contractor/project" variant="outlined" sx={{ color: "#f45b0b", borderColor: "#f45b0b", px: 3, py: 1.25, borderRadius: 1.5, fontWeight: 650, "&:hover": { borderColor: "#e94c00", bgcolor: "#fff8f4" } }}>{t("dashboard.contractor.view_projects")}</Button>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 21, mb: 1.5, "&:after": { content: '""', display: "block", mt: 1, width: 42, height: 3, bgcolor: "#ff5b0a", borderRadius: 2 } }}>{t("dashboard.contractor.view_projects")}</Typography>
          <Box sx={{ overflow: "hidden", borderRadius: 3, boxShadow: "0 5px 20px rgba(25,35,45,.08)", bgcolor: "rgba(255,255,255,.96)" }}>
            {projects?.recentProjects?.length ? projects.recentProjects.map((project) => {
              const done = project.status?.toLowerCase() === "completed";
              return <Box key={project._id} onClick={() => navigate(`/contractor/project/${project._id}`)} sx={{ minHeight: 70, px: { xs: 2, sm: 2.5 }, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #eceef0", cursor: "pointer", transition: "background .15s", "&:last-child": { borderBottom: 0 }, "&:hover": { bgcolor: "#fffaf7" } }}>
                <Box sx={{ width: 46, height: 46, bgcolor: "#fff0e9", color: "#ff5b0a", borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}><BusinessRoundedIcon /></Box>
                <Typography sx={{ fontWeight: 550, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</Typography>
                <Box component="span" sx={{ px: 1.7, py: .45, borderRadius: 10, bgcolor: done ? "#d9f3dd" : "#ffe4a3", color: done ? "#216b2c" : "#694b09", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{project.status}</Box>
              </Box>;
            }) : <Typography sx={{ color: "#667085", p: 3 }}>{t("dashboard.contractor.no_projects")}</Typography>}
          </Box>
        </Box>
      </Box>
      <Footer />
    </>
  );
}
