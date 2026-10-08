import React, { useState, useRef } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useParams, useNavigate } from "react-router-dom";
import SiteEngineerNavbar from "../../Components/SiteEngineerNavbar";
import Footer from "../../Components/Footer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { Button } from "@mui/material";

export default function SubmitReport() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const streamRef = useRef(null);

  const [data, setData] = useState({
    workDone: "",
    issuesFound: "",
  });

  // checking for access and setting io connection
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

  const { id } = useParams();

  useEffect(() => {
    // Check if socket is initialized before using it
    if (!socketRef.current || !id) return;

    // join the room
    socketRef.current.emit("join", { projectId: id });

    socketRef.current.on("project:deleted", (data) => {
      toast.info("Project has been deleted");
      navigate(`/site-engineer/projects`);
    });

  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axiosInstance.post(
      "/reports",
      { projectId: id, workDone: data.workDone, issuesFound: data.issuesFound }
    );

    navigate(-1);
  };

  // recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(streamRef.current);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        console.log("Audio Blob =", audioBlob);
        // const audioUrl = URL.createObjectURL(audioBlob);

        const formData = new FormData();

        formData.append("audio", audioBlob, "recording.webm");

        try {

          const response = await axiosInstance.post(
            "/reports/voice-to-text",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data"
              }
            }
          );

          console.log("Transcript =", response.data.transcript, response.data.structuredData);
          setData({
            workDone: response.data.structuredData.workDone,
            issuesFound: response.data.structuredData.issuesFound
          });
        } catch (err) {
          console.error(err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error("Mic Error =", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // stop microphone completely
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }
  };

  return (
    <div>
      <SiteEngineerNavbar />

      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, md: 4 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 760,
            p: { xs: 4, md: 6 },
            borderRadius: "16px",
            border: "1px solid #f0eaea",
            backgroundColor: "#ffffff",
            boxShadow: (theme) => theme.palette.baseShadow,
          }}
        >
          {/* HEADER */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h1" sx={{ mb: 0.5 }}>
              Submit <Box component="span" sx={{ color: "primary.main" }}>Daily Report</Box>
            </Typography>

            <Typography variant="body2">
              {t("project.report_date_label", {
                date: new Date().toLocaleDateString()
              })}
            </Typography>
          </Box>

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 4, height: 20, backgroundColor: 'primary.main', borderRadius: 1 }} />
                <Typography sx={{ fontWeight: 600 }}> {t('project.work_done')} </Typography>
              </Box>

              <TextField
                name="workDone"
                value={data.workDone}
                fullWidth
                multiline
                rows={2}
                margin="none"
                onChange={handleChange}
                disabled={isRecording}
                placeholder={isRecording ? 'Recording...' : 'Describe the work you have done...'}
                variant="outlined"
                sx={{
                  mt: 0,
                  '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      minHeight: 110,
                    },
                  '& .MuiOutlinedInput-input': {
                    padding: '14px 16px',
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 4, height: 20, backgroundColor: 'primary.main', borderRadius: 1 }} />
                <Typography sx={{ fontWeight: 600 }}> {t('project.issues')} </Typography>
              </Box>

              <TextField
                name="issuesFound"
                value={data.issuesFound}
                fullWidth
                multiline
                rows={2}
                margin="none"
                onChange={handleChange}
                disabled={isRecording}
                placeholder={isRecording ? 'Recording...' : 'Mention any issues or blockers...'}
                variant="outlined"
                sx={{
                  mt: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    minHeight: 90,
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '12px 16px',
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              {!isRecording ? (
                <Button
                  variant="outlined"
                  onClick={startRecording}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    backgroundColor: 'transparent',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    px: 2.5,
                    py: 0.8,
                    borderRadius: 2,
                  }}
                >
                  🎤 START RECORDING
                </Button>
              ) : (
                <Button
                  color="error"
                  variant="contained"
                  onClick={stopRecording}
                  sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                >
                  ⏹ STOP RECORDING
                </Button>
              )}

              <Box sx={{ flex: 1 }} />

              <Button
                type="submit"
                variant="contained"
                sx={{
                  backgroundColor: 'primary.main',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'primary.dark' },
                }}
              >
                {t('project.submit')}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>

      <Footer />
    </div>
  );

}

