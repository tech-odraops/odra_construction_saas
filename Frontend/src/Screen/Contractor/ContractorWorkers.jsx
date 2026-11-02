import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axiosInstance from "../../utils/axiosInstance";
import workerImage from "../../assets/Worker.png";
import { useTranslation } from "react-i18next";
import Button from "../../Components/atoms/Button/Button";

const fallbackWorkers = [
  { _id: "fallback-1", name: "Raju Sahoo", phone: "9876543210", currentProjectId: { title: "Basudha Tower" } },
  { _id: "fallback-2", name: "Ashok Das", phone: "9123456780", currentProjectId: null },
  { _id: "fallback-3", name: "Sanjay Patra", phone: "9988776655", currentProjectId: { title: "North Block Project" } },
  { _id: "fallback-4", name: "Mohan Nayak", phone: "9765432109", currentProjectId: null },
];

export default function ContractorWorkers() {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState(fallbackWorkers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await axiosInstance.get("/workers");
        const payload = Array.isArray(res?.data?.workers)
          ? res.data.workers
          : Array.isArray(res?.data)
            ? res.data
            : fallbackWorkers;
        setWorkers(payload.length ? payload : fallbackWorkers);
      } catch (err) {
        console.error(err);
        setWorkers(fallbackWorkers);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  return (
    <div className="workers-page" style={{ "--workers-art": `url("${workerImage}")` }}>
      <main className="workers-layout">
        <div className="workers-art-panel" role="img" aria-label="Site engineer at a construction project" />
        <section className="workers-content-panel">
          <Paper className="workers-card" elevation={0}>
            <div className="workers-header-row">
              <div className="workers-heading-block">
                <Typography component="h1" className="workers-title">{t("workers.workers")}</Typography>
                <Typography component="p" className="workers-subtitle">{t("workers.workers_desc")}</Typography>
              </div>
            </div>
            {loading ? (
              <Box className="workers-loading"><CircularProgress sx={{ color: "#F97316" }} /></Box>
            ) : (
              <>
                <TableContainer className="workers-table-container">
                  <Table className="workers-table" size="small" aria-label="Workers">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("workers.worker_name")}</TableCell>
                        <TableCell>{t("workers.phone")}</TableCell>
                        <TableCell>{t("workers.status")}</TableCell>
                        <TableCell>{t("workers.assigned_project")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workers.map((worker) => {
                        const assigned = Boolean(worker.currentProjectId);
                        return (
                          <TableRow key={worker._id}>
                            <TableCell>{worker.name}</TableCell>
                            <TableCell>{worker.phone || "—"}</TableCell>
                            <TableCell><span className={`worker-status ${assigned ? "is-assigned" : "is-free"}`}>{assigned ? "Assigned" : "Free"}</span></TableCell>
                            <TableCell>{worker.currentProjectId?.title || t("workers.not_assigned")}</TableCell>
                          </TableRow>
                        );
                      })}
                      {workers.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="workers-empty-cell">No workers yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <div className="workers-footer-actions">
                  <Button className="workers-add-button" component={Link} to="/contractor/add-worker" startIcon={<AddIcon />}>
                    Add Worker
                  </Button>
                </div>
              </>
            )}
          </Paper>
        </section>
      </main>
    </div>
  );
}
