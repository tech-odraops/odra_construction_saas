import React, { useEffect, useState, useRef } from 'react';
import ContractorNavbar from '../../Components/ContractorNavbar';
import Footer from '../../Components/Footer';
import WageModal from "../../Components/WageModal";
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import ChatModal from '../../Components/ChatModal';
import axiosInstance from '../../utils/axiosInstance';
import { useTranslation } from "react-i18next";
import LockIcon from "@mui/icons-material/Lock";
import MiscExpenseModal from "../../Components/MiscExpenseModal";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StatusChips from "../../Components/atoms/StatusChips/StatusChips";

function getAssignedSiteEngineers(project) {
  const engineers = [
    ...(Array.isArray(project?.siteEngineers) ? project.siteEngineers : []),
    project?.siteEngineer,
  ].filter(Boolean);
  const seenIds = new Set();

  return engineers.filter((engineer) => {
    const id = typeof engineer === "object" ? engineer?._id : engineer;
    if (!id) return true;

    const normalizedId = id.toString();
    if (seenIds.has(normalizedId)) return false;
    seenIds.add(normalizedId);
    return true;
  });
}

function getAssignedSiteEngineerIds(project) {
  return new Set(
    getAssignedSiteEngineers(project)
      .map((engineer) => (typeof engineer === "object" ? engineer?._id : engineer))
      .filter(Boolean)
      .map((id) => id.toString())
  );
}

function OverviewBuildingIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V3.5c0-.55.45-1 1-1h9c.55 0 1 .45 1 1V21M15 9h4c.55 0 1 .45 1 1v11M2.5 21h19" /><path d="M7 6h1M11 6h1M7 9h1M11 9h1M7 12h1M11 12h1M7 15h1M11 15h1M17 12h1M17 15h1M17 18h1M9.5 21v-3h2v3" /></svg>;
}

function OverviewFlagIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v18" /><path d="M6 4c4-3 8 3 13 0v9c-5 3-9-3-13 0V4Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" /></svg>;
}

function SiteEngineerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21c.4-3.3 3-5.5 8-5.5s7.6 2.2 8 5.5" /><path d="M7 10a5 5 0 0 1 10 0v2H7v-2Z" /><path d="M5.5 10h13M12 4V2.5M8.5 5.5l-1-1M15.5 5.5l1-1" /><path d="M9 12v1.2a3 3 0 0 0 6 0V12" /></svg>;
}

function InventoryCubeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 9 4.7v9.6l-9 4.7-9-4.7V7.2l9-4.7Z" fill="currentColor" /><path d="m3.5 7.4 8.5 4.5 8.5-4.5M12 12v9" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
// import { toast } from 'react-toastify';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from "@mui/material";
import FullScreenLoader from "../../Components/FullScreenLoader"

export default function ProjectDetails() {
  const [openMiscModal, setOpenMiscModal] = useState(false);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openWageModal, setOpenWageModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [siteMembers, setSiteMembers] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState("");
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Site Engineer");
  const [sendingInvite, setSendingInvite] = useState(false);
  const { id } = useParams();
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const overviewTitle = t("project.project_overview");
  const overviewTitleSplit = overviewTitle.lastIndexOf(" ");
  const assignedSiteEngineers = getAssignedSiteEngineers(project);
  const assignedSiteEngineerIds = getAssignedSiteEngineerIds(project);

  const handleCompleteProject = async () => {
    const confirm = window.confirm(
      "Are you sure? This will free all workers and lock attendance."
    );
    if (!confirm) return;

    try {
      await axiosInstance.post(
        `/projects/${id}/complete`
      );

      toast.success("Project completed");
      setProject(prev => ({ ...prev, status: "Completed" }));

    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };


  const searchSiteMembers = async (searchValue) => {
    setMemberSearch(searchValue);
    if (!searchValue.trim()) {
      setSiteMembers([]);
      return;
    }

    setMemberSearchLoading(true);
    try {
      const response = await axiosInstance.get("/site-members", {
        params: { search: searchValue.trim() },
      });
      const members = Array.isArray(response.data?.members)
        ? response.data.members
        : [];
      setSiteMembers(members.filter((member) => member.role === "Site Engineer"));
    } catch (error) {
      console.error("Search site members error:", error);
      toast.error(error.response?.data?.message || "Unable to search site members.");
      setSiteMembers([]);
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const inviteSiteMember = async (event) => {
    event.preventDefault();

    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();

    if (!name || !email || !inviteRole) {
      toast.error("Name, email, and role are required.");
      return;
    }

    setSendingInvite(true);
    try {
      await axiosInstance.post("/site-members/invite", {
        name,
        email,
        role: inviteRole,
      });

      toast.success("Invitation sent. The member can be assigned after activating their account.");
      setOpenInviteDialog(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("Site Engineer");
      setMemberSearch("");
      setSiteMembers([]);
    } catch (error) {
      console.error("Invite site member error:", error);
      toast.error(error.response?.data?.message || "Unable to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  const assignSiteEngineer = async (member) => {
    if (!member?._id) return;

    if (assignedSiteEngineerIds.has(member._id)) {
      toast.info("This Site Engineer is already assigned to the project.");
      return;
    }

    setAssigningMemberId(member._id);

    try {
      await axiosInstance.post(`/site-members/projects/${id}/assign`, {
        userId: member._id,
      });
      setProject((previous) => ({
        ...previous,
        siteEngineers: [...getAssignedSiteEngineers(previous), member],
      }));
      await fetchProject();
      setSiteMembers([]);
      setMemberSearch("");
      toast.success("Site Engineer assigned successfully.");
    } catch (error) {
      console.error("Assign Site Engineer error:", error);
      toast.error(error.response?.data?.message || "Could not assign Site Engineer.");
    } finally {
      setAssigningMemberId("");
    }
  };

  const fetchProject = async () => {
    try {
      const res = await axiosInstance.get(`/projects/${id}`);
      console.log(res);

      if (res.status === 200) {
        setProject(res.data.project);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching project");
      setLoading(false);
    }
  };

  // handle open edit modal function
  const handleOpenEdit = () => {
    setNewTitle(project?.title || "");
    setOpenEditModal(true);
  }

  // update title function
  const updateProjectTitle = async () => {
    try {
      const response = await axiosInstance.patch(
        `/projects/${id}/title`,
        {
          title: newTitle
        }
      );
      setProject((prev) => ({
        ...prev,
        title: newTitle
      }))
      setOpenEditModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Unable to edit the title.");
    }
  }

  useEffect(() => {
    fetchProject();

    // set the socket connection
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket']
    });
    socketRef.current.emit("join", {
      projectId: id
    });

    // listen for report:new event
    socketRef.current.on("report:new", (data) => {
      console.log("New report received:", data);
      // update the project state with the new report
      setProject((prevData) => {
        if (!prevData) return prevData;
        // Prevent duplicate reports by checking _id
        if (
          prevData.reports.some(
            (report) => report._id === data.newReport._id
          )
        ) {
          return prevData;
        }
        return {
          ...prevData,
          reports: [
            ...prevData.reports,
            {
              ...data.newReport,
              siteEngineerId: {
                ...data.newReport.siteEngineerId,
                name: data.siteEngName
              }
            }
          ]
        };

      });
      toast.info(`New report received: ${data.projectTitle}`, {
        onClick: () => {
          if (data.newReport?._id) {
            navigate(`/contractor/view-report/${data.newReport._id}`);
          }
        }
      });
    });

    socketRef.current.on("misc:new", (data) => {

      toast.info(
        `New misc expense added: ${data.itemName}`
      );
      fetchProject();

    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  console.log(project)

  if (loading) return <FullScreenLoader />;

  // Safe checks for when project is not loaded due to error
  if (!project) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <ContractorNavbar />
        <Box className="container py-5">
          <Typography variant="h6" color="error">
            {t("project.unable_load")}
          </Typography>
        </Box>
        <Footer />
      </Box>
    );
  }

  return (
    <Box
      className="project-overview-page"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9fafb",
      }}
    >
      <ContractorNavbar />

      <Box className="project-overview-main">
        {/* HEADER */}
        <Box className="project-overview-heading" sx={{ mb: 3 }}>
          <Typography variant="h1" className="project-overview-title">
            {overviewTitleSplit > 0 ? <>{overviewTitle.slice(0, overviewTitleSplit)} <span>{overviewTitle.slice(overviewTitleSplit + 1)}</span></> : <span>{overviewTitle}</span>}
          </Typography>
          <Typography variant="body1" className="project-overview-subtitle">
            {t("project.project_overview_desc")}
          </Typography>
        </Box>


        {/* MANAGE SITE MEMBERS */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            p: { xs: 2.5, md: 3 },
            mb: 4,
            boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Manage Site Members
          </Typography>
          <Typography variant="body2" sx={{ color: "#667085", mb: 2 }}>
            Search for an active Site Engineer in your organization and assign them to this project. New members must activate their account before they can be assigned.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Site Engineers"
              placeholder="Enter name or email"
              value={memberSearch}
              onChange={(event) => searchSiteMembers(event.target.value)}
              inputProps={{ maxLength: 100 }}
            />
            <Button
              variant="outlined"
              onClick={() => setOpenInviteDialog(true)}
              sx={{ whiteSpace: "nowrap", minWidth: { sm: "190px" } }}
            >
              + Invite New Member
            </Button>
          </Box>

          {memberSearchLoading && <CircularProgress size={24} sx={{ mb: 1 }} />}

          {memberSearch.trim() && !memberSearchLoading && (
            <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
              {siteMembers.length > 0 ? siteMembers.map((member) => (
                <Box
                  key={member._id}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    p: 1.5,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { sm: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{member.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{member.email}</Typography>
                    <Typography variant="caption" color="text.secondary">{member.role}</Typography>
                  </Box>
                  {!assignedSiteEngineerIds.has(member._id) && (
                    <Button
                      variant="contained"
                      disabled={Boolean(assigningMemberId)}
                      onClick={() => assignSiteEngineer(member)}
                    >
                      {assigningMemberId === member._id ? "Assigning..." : "Assign"}
                    </Button>
                  )}
                </Box>
              )) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No active Site Engineers found for this search.
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, backgroundColor: "#f8fafc" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Currently assigned site engineers
            </Typography>
            {assignedSiteEngineers.length > 0 ? (
              <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2.5 }}>
                {assignedSiteEngineers.map((engineer, index) => (
                  <li key={typeof engineer === "object" ? engineer?._id || index : engineer}>
                    <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
                      {typeof engineer === "object" ? engineer?.name || "Site Engineer" : "Site Engineer"}
                    </Typography>
                    {typeof engineer === "object" && engineer?.email && (
                      <>
                        {" — "}
                        <Typography
                          component="a"
                          variant="body2"
                          href={`mailto:${engineer.email}`}
                          sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                        >
                          {engineer.email}
                        </Typography>
                      </>
                    )}
                  </li>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                No site engineers assigned yet.
              </Typography>
            )}
          </Box>
        </Box>

        {/* PROJECT INFO CARD */}
        <Box
          className="project-overview-grid"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            gap: 4,
            mb: 5,
          }}
        >
          {/* LEFT: DETAILS */}
          <Box
            className="project-details-card"
            sx={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              p: 4,
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <Box className="project-details-title-row" display="flex" alignItems="center" gap={1}>
              <Box className="project-details-building"><OverviewBuildingIcon /></Box>
              <Box className="project-details-title-copy">
                <div className="project-name-line">
                  <Typography variant="h4" className="project-details-title">{project.title}</Typography>
                  <EditIcon
                className="project-title-edit"
                sx={{
                  cursor: "pointer",
                  fontSize: 22,
                  color: "#666"
                }}
                onClick={handleOpenEdit}
              />
                </div>
                <Typography variant="body2" className="project-details-description">{project.description}</Typography>
              </Box>
            </Box>
            <Box className="project-metadata-list">
              <div className="project-metadata-row"><OverviewFlagIcon /><strong>{t("project.status")}:</strong>
                <StatusChips
                  label={project.status || t("project.ongoing")}
                  status={project.status || "ongoing"}
                  style={{ justifySelf: "start", alignSelf: "center" }}
                />
              </div>
              <div className="project-metadata-row"><CalendarMonthOutlinedIcon /><strong>{t("project.start_date")}:</strong><span>{project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "—"}</span></div>
              <div className="project-metadata-row"><EventAvailableOutlinedIcon /><strong>{t("project.end_date")}:</strong><span>{project.endDate ? new Date(project.endDate).toLocaleDateString("en-GB") : "—"}</span></div>
              <div className="project-metadata-row"><PersonOutlineIcon /><strong>{t("project.contractor")}:</strong><span>{project.contractor?.name || "N/A"}</span></div>
              <div className="project-metadata-row">
                <SiteEngineerIcon />
                <strong>{t("project.site_engineers")}:</strong>
                <Box component="span" sx={{ display: "grid", gap: 0.5, py: 1 }}>
                  {assignedSiteEngineers.length > 0 ? assignedSiteEngineers.map((engineer, index) => (
                    <span key={typeof engineer === "object" ? engineer?._id || index : engineer}>
                      {typeof engineer === "object" ? engineer?.name || "Site Engineer" : "Site Engineer"}
                    </span>
                  )) : <span>N/A</span>}
                </Box>
              </div>
            </Box>
          </Box>

          {/* RIGHT: ACTIONS */}
          <Box
            className="project-actions-card"
            sx={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              p: 4,
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              height: "fit-content",
            }}
          >
            <Typography variant="h4" className="project-actions-title">
              {t("project.actions")}
            </Typography>

            <Button
              className="overview-action primary-action"
              startIcon={<VisibilityOutlinedIcon />}
              variant="contained"
              onClick={() => {

                navigate(`/contractor/projects/${id}/attendance`);
              }}
              sx={{
                position: "relative",
                opacity: 1,
                backgroundColor: "primary.main",
                color: "#000",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "white",
                },
              }}
            >
              {t("project.view_attendance")}

              {false && (
                <LockIcon
                  fontSize="small"
                  sx={{
                    ml: 1,
                    fontSize: 18,
                    color: "#ff9800"
                  }}
                />
              )}
            </Button>

            <Button
              className="overview-action"
              startIcon={<Groups2OutlinedIcon />}
              variant="outlined"
              onClick={() => {

                setOpenWageModal(true)
              }}
              sx={{
                position: "relative",
                opacity: 1,
                color: "#F97316",
                borderColor: "#F97316",
                backgroundColor: "#fff",
                fontWeight: 600,
                "&:hover": {
                  borderColor: "#e9650e",
                  backgroundColor: "#fff7f2",
                  color: "#F97316",
                },
              }}
            >
              View Worker Wages
              {false && (
                <LockIcon
                  fontSize="small"
                  sx={{
                    ml: 1,
                    fontSize: 18,
                    color: "#ff9800"
                  }}
                />
              )}
            </Button>

            {project.status === "Ongoing" && (
              <>
                <Button
                  className="overview-action"
                  startIcon={<Groups2OutlinedIcon />}
                  variant="contained"
                  color="secondary"
                  onClick={() => {

                    navigate(`/contractor/projects/${id}/assign-workers`);
                  }}
                  sx={{
                    position: "relative",
                    opacity: 1,
                    backgroundColor: "primary.main",
                    color: "#000",
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "white",
                    },

                  }}
                >
                  {t("project.assign_workers")}

                  {false && (
                    <LockIcon
                      fontSize="small"
                      sx={{
                        ml: 1,
                        fontSize: 18,
                        color: "#ff9800"
                      }}
                    />
                  )}
                </Button>

                <Button
                  className="overview-action"
                  variant="contained"
                  color="error"
                  onClick={handleCompleteProject}
                >
                  {t("project.mark_completed")}
                </Button>
              </>
            )}

            <Button
              className="overview-action"
              startIcon={<InventoryCubeIcon />}
              variant="outlined"
              onClick={() =>
                navigate(`/contractor/projects/${id}/inventory`)
              }
            >
              {t("project.view_inventory")}
            </Button>

            <Button
              className="overview-action misc-action"
              startIcon={<MonetizationOnOutlinedIcon />}
              variant="contained"
              color="warning"
              onClick={() => {

                setOpenMiscModal(true)
              }}
              sx={{
                position: "relative",
                opacity: 1,
                color: "primary.main",
                borderColor: "primary.main",
                fontWeight: 600,
                "&:hover": {
                  borderColor: "primary.main",
                  color: "primary.main",
                },
              }}
            >
              View Misc Expenses
              {false && (
                <LockIcon
                  fontSize="small"
                  sx={{
                    ml: 1,
                    fontSize: 18,
                    color: "#ff9800"
                  }}
                />
              )}
            </Button>

            {project.status === "Completed" && (
              <Typography className="project-locked-note" color="error" variant="body2">
                {t("project.project_locked")}
              </Typography>
            )}

            <Box sx={{ position: "relative" }}>
              {false ? (
                <Button
                  className="overview-chat-button"
                  variant="outlined"
                  sx={{
                    opacity: 0.6,
                    position: "relative"
                  }}
                  onClick={() => {}}
                >
                  Chat
                  <LockIcon
                    fontSize="small"
                    sx={{
                      ml: 1,
                      fontSize: 16,
                      color: "#ff9800"
                    }}
                  />
                </Button>
              ) : (
                <span className="overview-chat-button"><ChatModal projectId={id} showIcon /></span>
              )}
            </Box>
          </Box>
        </Box>

        {/* REPORTS SECTION */}

        {false ? (

          <Box
            className="project-reports-locked"
            sx={{
              mt: 4,
              p: 4,
              textAlign: "center",
              borderRadius: 3,
              border: "1px dashed #ddd",
              backgroundColor: "#fafafa",
            }}
          >
            <Typography variant="h5" >
              🔒 {t("project.reports")}
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 1 }}
            >

            </Typography>

          </Box>

        ) : <Box className="project-reports-section">
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {t("project.reports")}
          </Typography>

          {Array.isArray(project.reports) && project.reports.length === 0 && (
            <Typography variant="body1">
              {t("project.no_reports")}
            </Typography>
          )}

          <Box sx={{ display: "grid", gap: 3, mt: 3 }}>
            {Array.isArray(project.reports) &&
              project.reports.map((report) => (
                <Box
                  key={report._id}
                  className="project-report-card"
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: "14px",
                    p: 3,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="project-report-icon"><DescriptionOutlinedIcon /></div>
                  <Typography variant='body1' fontWeight="bold">
                    {t("project.report_by", { name: report.siteEngineerId?.name || "Unknown" })}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>{t("project.work_done")}:</strong> {report.workDone.slice(0, 20) + "...."}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>{t("project.issues")}:</strong> {report.issuesFound}
                  </Typography>

                  {report.contractorStatus && (
                    <Box sx={{ mt: 1 }}>
                      <span className={`badge ${report.contractorStatus.toLowerCase() === "approved" ? "is-approved" : "is-pending"}`}>
                        {report.contractorStatus}
                      </span>
                    </Box>
                  )}

                  <Button
                    className="view-report-button"
                    variant="outlined"
                    size="small"
                    endIcon={<OpenInNewIcon />}
                    sx={{
                      mt: 2,
                      opacity: 1,
                      position: "relative",
                      backgroundColor: "primary.main",
                      color: "#000",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "white",
                      },

                    }}
                    onClick={() => {

                      navigate(`/contractor/view-report/${report._id}`);
                    }}
                  >
                    {t("project.view_report")}

                    {false && (
                      <LockIcon
                        fontSize="small"
                        sx={{
                          ml: 1,
                          fontSize: 16,
                          color: "#ff9800"
                        }}
                      />
                    )}
                  </Button>

                </Box>
              ))}
          </Box>
        </Box>}

      </Box>

      <WageModal
        open={openWageModal}
        onClose={() => setOpenWageModal(false)}
        projectId={id}
      />

      <MiscExpenseModal
        open={openMiscModal}
        onClose={() => setOpenMiscModal(false)}
        project={project}
        refreshProject={fetchProject}
      />

      <Dialog
        open={openInviteDialog}
        onClose={() => {
          if (!sendingInvite) setOpenInviteDialog(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Invite New Site Member</DialogTitle>
        <Box component="form" onSubmit={inviteSiteMember}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              An activation email will be sent. This member will become selectable for project assignment after activating their account.
            </Typography>
            <TextField
              fullWidth
              required
              margin="normal"
              label="Full name"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              fullWidth
              required
              margin="normal"
              type="email"
              label="Email address"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              inputProps={{ maxLength: 254 }}
            />
            <TextField
              fullWidth
              required
              select
              margin="normal"
              label="Role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <MenuItem value="Site Engineer">Site Engineer</MenuItem>
              <MenuItem value="Site Supervisor">Site Supervisor</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpenInviteDialog(false)}
              disabled={sendingInvite}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={sendingInvite}>
              {sendingInvite ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        className="project-title-dialog"
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
      >

        <DialogTitle>
          Edit Project Title
        </DialogTitle>

        <DialogContent>

          <TextField
            fullWidth
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mt: 1 }}
          />

        </DialogContent>

        <DialogActions>

          <Button
            onClick={() => setOpenEditModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={updateProjectTitle}
          >
            Update
          </Button>

        </DialogActions>

      </Dialog>

      <Footer />
    </Box>
  );

}
