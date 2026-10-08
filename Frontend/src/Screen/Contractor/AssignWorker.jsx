import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ContractorNavbar from "../../Components/ContractorNavbar";
import Footer from "../../Components/Footer";
import axiosInstance from "../../utils/axiosInstance";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress
} from "@mui/material";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import FullScreenLoader from "../../Components/FullScreenLoader";

export default function AssignWorkers() {
  const { t } = useTranslation();
  const {id: projectId } = useParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // check if it is allowed in the plan
  useEffect(() => {

  }, []);

  /* -------------------------
     Fetch FREE workers
  -------------------------- */
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await axiosInstance.get(
          "/workers"
        );

        // show ONLY free workers
        const freeWorkers = res.data.workers.filter(
          (w) => w.status === "free"
        );

        setWorkers(freeWorkers);
      } catch (err) {
        toast.error("Failed to load workers");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  /* -------------------------
     Assign worker to project
  -------------------------- */
  const assignWorker = async (workerId) => {
    try {
      await axiosInstance.post(
        `/workers/${workerId}/assign`,
        { projectId }
      );

      toast.success("Worker assigned successfully");

      // remove from list instantly
      setWorkers(prev => prev.filter(w => w._id !== workerId));

    } catch (err) {
      toast.error(
        err.response?.data?.error || "Failed to assign worker"
      );
    }
  };

  if (loading) return <FullScreenLoader />;

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
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {t("workers.assign_workers")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("workers.assign_workers_desc")}
            </Typography>
          </Box>

          {/* LOADING */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {/* EMPTY STATE */}
          {!loading && workers.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: "16px",
                textAlign: "center",
                boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t("workers.no_free_workers")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("workers.no_free_workers_desc")}
              </Typography>
            </Paper>
          )}

          {/* WORKER LIST */}
          {!loading && workers.length > 0 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "1fr 1fr",
                  lg: "1fr 1fr 1fr",
                },
                gap: 3,
              }}
            >
              {workers.map((worker) => (
                <Paper
                  key={worker._id}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: "16px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "0.25s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 18px 45px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {worker.name}
                    </Typography>

                    {worker.phone && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        📞 {worker.phone}
                      </Typography>
                    )}

                    <Typography
                      variant="caption"
                      sx={{
                        display: "inline-block",
                        mt: 1,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "10px",
                        backgroundColor: "#fff2e8",
                        color: "#F97316",
                        fontWeight: 600,
                      }}
                    >
                      {t("workers.available")}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    sx={{
                      mt: 3,
                      fontWeight: 600,
                      backgroundColor: "#F97316",
                      "&:hover": {
                        backgroundColor: "#E65E0C",
                      },
                    }}
                    onClick={() => assignWorker(worker._id)}
                  >
                    {t("workers.assign_worker_btn")}
                  </Button>
                </Paper>
              ))}
            </Box>
          )}

          {/* BACK ACTION */}
          <Box sx={{ mt: 5 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{
                fontWeight: 600,
              }}
            >
              {t("workers.back_to_project")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Footer />
    </>
  );

}
