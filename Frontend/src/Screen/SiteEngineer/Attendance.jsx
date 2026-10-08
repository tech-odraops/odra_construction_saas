import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SiteEngineerNavbar from "../../Components/SiteEngineerNavbar";
import Footer from "../../Components/Footer";
import {
  Box,
  Typography,
  Paper,
  Button,
  Switch,
  CircularProgress,
  TextField,
  InputAdornment
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import FullScreenLoader from "../../Components/FullScreenLoader";
import pageBackground from "../../assets/background image.png";

export default function Attendance() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { t } = useTranslation();
  const [project, setProject] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {

    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, []);

  useEffect(()=>{
    // Check if socket is initialized before using it
    if (!socketRef.current || !projectId) return;

    // join the room
    socketRef.current.emit("join", { projectId: projectId });

    socketRef.current.on("project:deleted", (data) => {
      toast.info("Project has been deleted");
      navigate(`/site-engineer/projects`);
    });

  },[projectId])

  /* --------------------------------
     Fetch project, workers & attendance
  --------------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1️⃣ Fetch project
        const projectRes = await axiosInstance.get(`/projects/${projectId}`);
        setProject(projectRes.data.project);

        // 2️⃣ Fetch workers assigned to this project
        const workerRes = await axiosInstance.get(`/attendance/workers/${projectId}`);
        setWorkers(workerRes.data.workers);

        // 3️⃣ Fetch attendance for selected date
        const attendanceRes = await axiosInstance.get(`/attendance/${projectId}/${date}`);

        // 4️⃣ Attendance exists → hydrate from DB
        if (attendanceRes.data.attendance) {
          const existing = {};
          attendanceRes.data.attendance.records.forEach(rec => {
            existing[rec.workerId._id] = rec.status;
          });
          setAttendance(existing);
        }
        // 5️⃣ Attendance does NOT exist → default all to absent
        else {
          const defaults = {};
          workerRes.data.workers.forEach(w => {
            defaults[w._id] = "absent";
          });
          setAttendance(defaults);
        }

      } catch (err) {
        toast.error("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, date]);

  /* --------------------------------
     Toggle present / absent
  --------------------------------- */
  const toggleAttendance = (workerId) => {
    setAttendance(prev => ({
      ...prev,
      [workerId]: prev[workerId] === "present" ? "absent" : "present"
    }));
  };

  /* --------------------------------
     Submit attendance
  --------------------------------- */
  const submitAttendance = async () => {
    if (project.status === "Completed") {
      toast.error("Attendance is locked for completed projects");
      return;
    }

    try {
      const records = Object.keys(attendance).map(workerId => ({
        workerId,
        status: attendance[workerId]
      }));

        await axiosInstance.post("/attendance/mark", { projectId, date, records });

      toast.success("Attendance saved successfully");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save attendance"
      );
    }
  };

  if (loading) return <FullScreenLoader />;

  return (
    <>
      <SiteEngineerNavbar />

      <Box
        sx={{
          position: "relative",
          minHeight: "100vh",
          backgroundColor: "#fff",
          backgroundImage: `url(${pageBackground})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
          px: { xs: 2, md: 6 },
          py: { xs: 3, md: 5 },
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "relative", maxWidth: 980, mx: "auto" }}>
          {/* HEADER */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h1"
              sx={{
                mb: 1,
                fontSize: { xs: "1.8rem", sm: "2.1rem", md: "2.5rem" },
                fontWeight: 800,
                letterSpacing: "-0.06em",
                lineHeight: 1.1,
                color: "#111827",
              }}
            >
              {t("attendance.attendance")}
              <Box component="span" sx={{ color: "#F97316" }}>.</Box>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: "#4b5563",
                fontSize: "0.92rem",
                fontWeight: 400,
                opacity: 0.95,
              }}
            >
              {t("attendance.attendance_desc")}
            </Typography>
          </Box>

          {/* DATE PICKER */}
          <Box
            sx={{
              mb: 3,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <TextField
              type="date"
              value={date}
              inputProps={{
                min: project?.startDate?.split("T")[0],
                max:
                  project?.status === "Completed"
                    ? project?.endDate?.split("T")[0]
                    : new Date().toISOString().split("T")[0],
              }}
              disabled={project?.status === "Completed"}
              onChange={(e) => setDate(e.target.value)}
              sx={{
                width: 260,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#fbfbfb",
                  borderRadius: "10px",
                  height: "52px",
                  border: "1px solid #d6d6d6",
                  boxShadow: "0 1px 0 rgba(15,23,42,0.02)",
                  color: "#111827",
                  fontWeight: 600,
                  fontSize: "1.05rem",
                  paddingRight: 0,
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
                "& .MuiInputAdornment-root": {
                  marginRight: 1,
                },
              }}
            //   InputProps={{
            //     endAdornment: (
            //       <InputAdornment position="end">
            //         <Box
            //           sx={{
            //             display: "flex",
            //             alignItems: "center",
            //             justifyContent: "center",
            //             width: 30,
            //             height: 30,
            //             mr: 1,
            //             color: "#F97316",
            //           }}
            //         >
            //           <CalendarTodayOutlinedIcon fontSize="small" />
            //         </Box>
            //       </InputAdornment>
            //     ),
            //   }}
            />
          </Box>

          { <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              width: "100%",
              minHeight: 76,
              p: 2,
              borderRadius: "14px",
              border: "1px solid #e6e4e3",
              backgroundColor: "#f7f7f7",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "10px",
                backgroundColor: "#F97316",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>

            <Typography
              sx={{
                fontSize: "0.92rem",
                color: "#404852",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {t("attendance.attendance_desc")}
            </Typography>
          </Paper> }

          {/* ATTENDANCE LIST */}
          <Paper
            elevation={0}
            sx={{
              maxWidth: 900,
              mx: "auto",
              mt: 4,
              p: { xs: 2, md: 3 },
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
            }}
          >
            {workers.length === 0 && (
              <Typography color="text.secondary">
                {t("attendance.attendance_desc")}
              </Typography>
            )}

            {workers.map((worker) => (
              <Box
                key={worker._id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1.5,
                  borderBottom: "1px solid #f1f1f1",
                }}
              >
                <Typography sx={{ fontWeight: 500 }}>
                  {worker.name}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    color={
                      attendance[worker._id] === "present"
                        ? "success.main"
                        : "text.secondary"
                    }
                  >
                    {attendance[worker._id] === "present"
                      ? t("attendance.present")
                      : t("attendance.absent")}
                  </Typography>

                  <Switch
                    checked={attendance[worker._id] === "present"}
                    onChange={() => toggleAttendance(worker._id)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#F97316",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#F97316",
                      },
                    }}
                    disabled={project.status === "Completed"}
                  />
                </Box>
              </Box>
            ))}

            {project.status !== "Completed" && workers.length > 0 && (
              <Button
                variant="contained"
                fullWidth
                sx={{
                  mt: 3,
                  backgroundColor: "#F97316",
                  "&:hover": {
                    backgroundColor: "#E65E0C",
                  },
                }}
                onClick={submitAttendance}
              >
                {t("attendance.save_attendance")}
              </Button>
            )}

            {project.status === "Completed" && (
              <Typography color="error" sx={{ mt: 3 }}>
                {t("attendance.attendance_read_only")}
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>

      <Footer />
    </>
  );
}

