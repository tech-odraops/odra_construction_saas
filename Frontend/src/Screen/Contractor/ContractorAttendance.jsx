import React, { useState, useEffect,useRef } from "react";
import { useParams } from "react-router-dom";
import Footer from "../../Components/Footer";
import {
    Box,
    Typography,
    Paper,
    TextField,
    CircularProgress
} from "@mui/material";
import { toast } from "react-toastify";
import {io} from "socket.io-client"
import ContractorNavbar from "../../Components/ContractorNavbar";
import axiosInstance from "../../utils/axiosInstance";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function ContractorAttendance() {
    const { id: projectId } = useParams();
    const [date, setDate] = useState("");
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const socketRef = useRef(null);
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {

    }, []);

    // fetch attendance
    const fetchAttendance = async () => {
        if (!date) return;

        try {
            const res = await axiosInstance.get(`/attendance/${projectId}/${date}`);

            setProject(res.data.attendance.projectId);
            setAttendance(res.data.attendance);
            setLoading(false);
        } catch (err) {
            setAttendance({});
            setLoading(false);
            toast.error("Failed to fetch attendance");
        }
    }

    // make the socket connection one time
    useEffect(()=>{
        socketRef.current = io(import.meta.env.VITE_API_URL,{
            transports:["websocket"]
        })
        return ()=> socketRef.current.disconnect();
    },[projectId]);

    useEffect(()=>{
        socketRef.current.emit("join",{projectId});
        socketRef.current.on("attendance:updated",(data)=>{
            if(data.date === date){
                toast.success("Attendance has been marked");
                fetchAttendance()
            }
        })
        return ()=> socketRef.current.off("attendance:updated");
    },[date]);


    return (
        <>
          <ContractorNavbar />

          <Box
            sx={{
              minHeight: "100vh",
              backgroundColor: "#f9fafb",
              py: 5,
            }}
          >
            <Box className="container">
              {/* HEADER */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h1"   gutterBottom>
                  {t("attendance.attendance_overview")}
                </Typography>
                <Typography variant="body2" >
                  {t("attendance.attendance_overview_desc")}
                </Typography>
              </Box>

              {/* DATE SELECT */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: "16px",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t("attendance.select_date")}
                </Typography>

                <TextField
                  type="date"
                  onChange={(e) => setDate(e.target.value)}
                  onBlur={fetchAttendance}
                  sx={{ mt: 1 }}
                  inputProps={{
                    min: project?.startDate?.split("T")[0],
                    max:
                      project?.status === "Completed"
                        ? project?.endDate?.split("T")[0]
                        : new Date().toISOString().split("T")[0],
                  }}
                />
              </Paper>

              {/* ATTENDANCE LIST */}
              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!loading && attendance && attendance.records && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: "16px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {t("attendance.worker_attendance")}
                  </Typography>

                  {attendance.records.length === 0 && (
                    <Typography variant="body2">
                      {t("attendance.no_records_found")}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                    {attendance.records.map((rec) => (
                      <Box
                        key={rec.workerId._id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 2,
                          borderRadius: "12px",
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <Typography fontWeight={500}>
                          {rec.workerId.name}
                        </Typography>

                        <Typography
                          sx={{
                            fontWeight: 600,
                            color:
                              rec.status === "present"
                                ? "#F97316"
                                : "error.main",
                          }}
                        >
                          {rec.status === "present"
                            ? t("attendance.present")
                            : t("attendance.absent")}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>
          </Box>

          <Footer />
        </>
      );

}
