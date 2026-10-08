import React, { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import SiteEngineerNavbar from "../../Components/SiteEngineerNavbar";
import Footer from "../../Components/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import heroImg from "../../assets/pic.png";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Typography } from "@mui/material";
import Caroucell from "../../Components/Caroucell";

export default function SiteEngineer() {
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();


  useEffect(() => {
    // decode token to get REAL MongoDB user id
    const token = localStorage.getItem("token");
    if (!token) return;

    const decoded = jwtDecode(token);
    const siteEngineerId = decoded.User_id; // IMPORTANT

    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      socket.emit("join", {
        siteEngineerId
      });

      console.log("Joined room:", `siteEngineer-${siteEngineerId}`);
    });

    socket.on("project:assigned", (data) => {
      console.log("Project assigned event received:", data);
      toast.info(`New project assigned: ${data.newProject.title} by ${data.contractorName}`, {
        onClick: () => {
          if (data.newProject?._id) {
            navigate(`/site-engineer/projects/${data.newProject._id}`);
          } else {
            navigate("/site-engineer/projects");
          }
        }
      });
    });

    return () => {
      socket.off("project:assigned");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <>
      {/* <ToastContainer position="top-right" autoClose={4000} /> */}
      <SiteEngineerNavbar />

      {/* HERO SECTION */}
      <section
        style={{
          backgroundColor: "#f9fafb",
          minHeight: "100vh",
        }}
      >
        <Caroucell customStyles={{ "border-bottom": "1px dashed black" }} />

        {/* FEATURES SECTION */}
        <div className="container py-5">
          <div className="text-center mb-5">
            <Typography variant="h2">
              {t("dashboard.engineer.features_title")}
            </Typography>
            <Typography variant="body1" className=" mt-2">
              {t("dashboard.engineer.features_desc")}
            </Typography>
          </div>

          <div className="row g-4">
            {/* REAL-TIME UPDATES */}
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card border-0 h-100"
                style={{
                  borderRadius: "18px",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                }}
              >
                <div className="card-body p-4">
                  <Typography variant="h6" className="fw-semibold mb-3">
                    {t("dashboard.engineer.real_time_title")}
                  </Typography>
                  <Typography className="text-muted small">
                    {t("dashboard.engineer.real_time_desc")}
                  </Typography>
                </div>
              </div>
            </div>

            {/* PROJECT MANAGEMENT */}
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card border-0 h-100"
                style={{
                  borderRadius: "18px",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                }}
              >
                <div className="card-body p-4">
                  <Typography variant="h6" className="fw-semibold mb-3">{t("dashboard.engineer.project_mgmt_title")}</Typography>
                  <ul className="text-muted small ps-3">
                    <li className="mb-2">{t("dashboard.engineer.pm_1")}</li>
                    <li className="mb-2">{t("dashboard.engineer.pm_2")}</li>
                    <li className="mb-2">{t("dashboard.engineer.pm_3")}</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* UI */}
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card border-0 h-100"
                style={{
                  borderRadius: "18px",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                }}
              >
                <div className="card-body p-4">
                  <Typography variant="h6" className="fw-semibold mb-3">
                    {t("dashboard.engineer.ui_title")}
                  </Typography>
                  <Typography variant="body1" className="text-muted small">
                    {t("dashboard.engineer.ui_desc")}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </section>
    </>
  );

}
