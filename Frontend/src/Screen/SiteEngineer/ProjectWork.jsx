// import React from 'react'
import React, { useEffect, useState } from "react";
import Footer from '../../Components/Footer';
import SiteEngineerNavbar from '../../Components/SiteEngineerNavbar';
import { Link, useParams, useNavigate } from "react-router-dom";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { io } from "socket.io-client";
import { useRef } from "react";
import { toast } from "react-toastify";
import ChatModal from '../../Components/ChatModal';
import axiosInstance from "../../utils/axiosInstance";
import { useTranslation } from "react-i18next";
import LockIcon from "@mui/icons-material/Lock";
import { Button,TextField } from "@mui/material";
import AddMiscExpenseModal from "../../Components/AddMiscExpenseModal";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FullScreenLoader from "../../Components/FullScreenLoader";

export default function ProjectWork() {
  const [openInventoryModal, setOpenInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    unit: "",
    supplierName: "",
    companyName: "",
    quantity: "",
    pricePerUnit: "",
    purchaseDate: new Date().toISOString().split("T")[0],
  });

  const { id } = useParams();
  const [openMiscModal, setOpenMiscModal] = useState(false);
  const [project, setProjects] = useState({ reports: [] });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const { t } = useTranslation();

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
  }, [])

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    // Check if socket is initialized before using it
    if (!socketRef.current || !id) return;

    // join the room
    socketRef.current.emit("join", { projectId: id })

    const handler = (data) => {
      setProjects((prev) => ({
        ...prev,
        reports: prev.reports.map((r) => {
          // Convert both IDs to strings for comparison
          const reportId = r._id?.toString();
          const dataReportId = data.reportId?.toString();

          if (reportId === dataReportId) {
            return {
              ...r,
              contractorStatus: data.contractorStatus,
              contractorComment: data.contractorComment
            };
          }
          return r;
        })
      }));
      toast.info("Report has Been Reviewed");
    };

    socketRef.current.on("report:reviewed", handler);
    socketRef.current.on("project:completed", ({ projectId }) => {
      toast.info("Project has been completed");
      navigate(`/site-engineer/projects`);
    })

    socketRef.current.on("project:deleted", (data) => {
      toast.info("Project has been deleted");
      navigate(`/site-engineer/projects`);
    })

     socketRef.current.on("project:titleUpdated", (data) => {

      setProjects((prev) => ({
        ...prev,
        title: data.title
      }));

      toast.info(
        "Title Updated"
      );

    });

    socketRef.current.on("misc:updated", (data) => {

      toast.info(
        `Expense ${data.itemName} was ${data.status}`
      );

    });


    return () => {
      if (socketRef.current) {
        socketRef.current.off("report:reviewed", handler);
        socketRef.current.off("project:completed");
        socketRef.current.off("misc:updated");
        socketRef.current.off("project:titleUpdated");
        socketRef.current.disconnect();
      }
    };
  }, [id])

  const handleInventoryChange = (e) => {
    setInventoryForm({
      ...inventoryForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddInventory = async () => {

    try {
      // let projectId = id;
      await axiosInstance.post(
        `/inventory/${id}`,
        inventoryForm
      );

      toast.success("Inventory added");
      setOpenInventoryModal(false);

      setInventoryForm({
        name: "",
        unit: "",
        supplierName: "",
        companyName: "",
        quantity: "",
        pricePerUnit: "",
        purchaseDate: new Date().toISOString().split("T")[0]
      });

    } catch (error) {

      console.log(error);

      toast.error(
        error?.response?.data?.message || "Failed to add inventory"
      );

    }

  };

  const fetchProject = async () => {
    try {
      const res = await axiosInstance.get(`/projects/${id}`);
      setProjects(res.data.project);
      setLoading(false);

    } catch (e) {
      console.log(e);
    }
  }

  if (loading) return <FullScreenLoader />

  return (
    <div>
      <SiteEngineerNavbar />

      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
          px: { xs: 2, md: 6 },
          py: { xs: 3, md: 5 },
        }}
      >
        {/* PROJECT HEADER */}
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            mb: 4,
            px: { xs: 0, md: 0 },
            pt: { xs: 1, md: 2 },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              mb: 1,
              color: "#171c26",
              fontSize: { xs: "1.75rem", sm: "2rem" },
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-.025em",
            }}
          >
            {project.title}<Box component="span" sx={{ color: "#f97316" }}>.</Box>
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, color: "#68717c", fontSize: ".82rem" }}>
            <Link to="/site-engineer/projects" style={{ color: "inherit", textDecoration: "none" }}>
              {t("project.all_projects")}
            </Link>
            <Box component="span" aria-hidden="true" sx={{ color: "#8a929b", fontSize: "1.1rem" }}>›</Box>
            <Typography component="span" sx={{ color: "#f05a24", fontSize: "inherit" }}>
              {project.title}
            </Typography>
          </Box>

          {project.description && (
            <Typography variant="body1" sx={{ mt: 1.25, color: "#555e68", fontSize: ".92rem" }}>
              {project.description}
            </Typography>
          )}

        </Box>

        {/* CONTENT */}
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
          {/* REPORTS SECTION */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              mb: 4,
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t("project.previous_reports")}
            </Typography>


            {false ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  border: "1px dashed #ccc",
                  borderRadius: 3,
                  backgroundColor: "#fafafa",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#ff9800" }}
                >
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ mt: 1 }}
                >
                </Typography>
              </Box>

            ) : project.reports.length !== 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                {project.reports.map((rept, idx) => (
                  <Card
                    key={rept._id || idx}
                    sx={{
                      borderRadius: "14px",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, mb: 1 }}
                      >
                        {rept.workDone.slice(0, 10) + "...."}
                      </Typography>

                      <Typography
                        variant="body2"
                      >
                        {t("project.report_status")}: {rept.contractorStatus || t("project.pending")}
                      </Typography>

                      {rept.contractorComment && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            fontStyle: "italic",

                          }}
                        >
                          {t("project.comment")}: {rept.contractorComment}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" >
                {t("project.no_reports_submitted")}
              </Typography>
            )}

          </Paper>

          {/* ACTIONS */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t("project.actions")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {project.status !== "Completed" ? (
                <>
                {/* reports */}
                  <Button
                    component={Link}
                    to={`/site-engineer/projects/${id}/report`}
                    variant="contained"
                    sx={{
                      opacity: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "primary.main",
                      color: "#000",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "white",
                      },
                    }}
                    onClick={() => {


                    }}
                  >
                    {t("project.submit_report_btn")}

                    {false && (
                      <LockIcon
                        fontSize="small"
                        sx={{ fontSize: 16, color: "#ff9800" }}
                      />
                    )}
                  </Button>

                {/* Mark Attendance */}
                  <Button
                    component={Link}
                    to={`/site-engineer/projects/${id}/attendance`}
                    variant="outlined"
                    style={{
                      opacity: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "black",
                      borderColor: "white",
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: "primary.main",
                        color: "primary.main",
                      },
                    }}
                    onClick={() => {

                    }}
                  >
                    {t("project.mark_attendance")}

                    {false && (
                      <LockIcon
                        fontSize="small"
                        sx={{ fontSize: 16, color: "#ff9800" }}
                      />
                    )}
                  </Button>

                  {/* Log inventory Usages */}
                  <Button
                    component={Link}
                    variant="outlined"
                    to={`/site-engineer/projects/${id}/inventory`}
                    sx={{
                      color: "black",
                      borderColor: "primary.main",
                      fontWeight: 600
                    }}
                  >
                    {t("project.log_inventory")}
                  </Button>

                  {/* Add Inventory */}
                  <Button
                    variant="outlined"
                    onClick={() => setOpenInventoryModal(true)}
                    sx={{
                      color: "black",
                      borderColor: "primary.main",
                      fontWeight: 600
                    }}
                  >
                    ADD INVENTORY
                  </Button>

                  {/* Misc */}
                  <Button
                    // className="btn btn-sm btn-warning"
                    variant="outlined"
                    onClick={() => {

                      setOpenMiscModal(true)
                    }}
                    sx={{
                      opacity: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "black",
                      borderColor: "white",
                      fontWeight: 600,
                    }}
                  >
                    Add Misc Expense
                    {false && (
                      <LockIcon
                        fontSize="small"
                        sx={{ fontSize: 16, color: "#ff9800" }}
                      />
                    )}
                  </Button>


                </>
              ) : (
                <Typography color="error">
                  {t("project.project_completed_locked")}
                </Typography>
              )}

              {false ? (
                <Button

                  style={{
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={() => {}}
                >
                  CHAT
                  <LockIcon
                    fontSize="small"
                    sx={{ fontSize: 16, color: "#ff9800" }}
                  />
                </Button>
              ) : (
                <ChatModal projectId={id} />
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      <AddMiscExpenseModal
        open={openMiscModal}
        onClose={() => setOpenMiscModal(false)}
        projectId={id}
        onSuccess={fetchProject}
      />

      {/* Add Inventory Dia */}

      <Dialog
        open={openInventoryModal}
        onClose={() => setOpenInventoryModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Inventory</DialogTitle>

        <DialogContent>

          <TextField
            fullWidth
            margin="normal"
            label="Material Name"
            name="name"
            value={inventoryForm.name}
            onChange={handleInventoryChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Unit"
            name="unit"
            value={inventoryForm.unit}
            onChange={handleInventoryChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Supplier Name"
            name="supplierName"
            value={inventoryForm.supplierName}
            onChange={handleInventoryChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Company Name"
            name="companyName"
            value={inventoryForm.companyName}
            onChange={handleInventoryChange}
          />

          <TextField
            fullWidth
            margin="normal"
            type="number"
            label="Quantity"
            name="quantity"
            value={inventoryForm.quantity}
            onChange={handleInventoryChange}
          />

          <TextField
            fullWidth
            margin="normal"
            type="number"
            label="Price Per Unit"
            name="pricePerUnit"
            value={inventoryForm.pricePerUnit}
            onChange={handleInventoryChange}
          />

          <TextField
            fullWidth
            margin="normal"
            type="date"
            label="Purchase Date"
            name="purchaseDate"
            value={inventoryForm.purchaseDate}
            onChange={handleInventoryChange}
            InputLabelProps={{
              shrink: true
            }}
          />

        </DialogContent>

        <DialogActions>

          <Button
            onClick={() => setOpenInventoryModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleAddInventory}
          >
            Add
          </Button>

        </DialogActions>
      </Dialog>

      <Footer />
    </div>
  );

}
