import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import heroBg from "../assets/Home bg image.png";
import heroMachine from "../assets/Home Hero image.png";

const features = [
  { title: "ATTENDANCE MANAGEMENT", description: "Track worker attendance digitally with real-time reporting and accurate records.", icon: CalendarMonthOutlinedIcon },
  { title: "PROJECT MANAGEMENT", description: "Assign tasks, track progress, manage reports and keep projects on schedule.", icon: AssignmentOutlinedIcon },
  { title: "REAL-TIME CHAT", description: "Instant communication between contractors and site engineers to reduce delays.", icon: ForumOutlinedIcon },
  { title: "LABOUR MANAGEMENT", description: "Add workers, assign them to projects and optimize workforce utilization.", icon: EngineeringOutlinedIcon },
  { title: "INVENTORY MANAGEMENT", description: "Add materials, track usage, monitor stock levels and control project costs.", icon: Inventory2OutlinedIcon },
];

export default function Home() {
  return (
    <div className="home-page">
      <Navbar />
      <main>
        <Box className="home-hero" style={{ "--home-bg": `url("${heroBg}")` }}>
          <Container maxWidth="xl" className="home-hero-inner">
            <Box className="home-hero-copy">
              <Typography component="h1" className="home-headline">
                BUILDING<br /><span>SMARTER</span><br />TOMORROW
              </Typography>
              <Typography className="home-intro">
                <strong>ODRAOPS</strong> delivers reliable construction,<br className="home-copy-break" /> infrastructure, and <strong>resource management</strong><br className="home-copy-break" /> solutions.
              </Typography>
              <Button component={Link} to="/signup" variant="contained" className="home-cta">Get Started</Button>
            </Box>
            <Box className="home-machine-wrap" aria-hidden="true">
              <Box className="home-brand-panel"><span>ODRAOPS</span></Box>
              <img className="home-machine" src={heroMachine} alt="Yellow excavator at a construction site" />
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" className="home-features">
          <Typography component="h2" className="home-section-title">
            POWERFUL TOOLS FOR MODERN <span>CONSTRUCTION TEAMS</span>
          </Typography>
          <Typography className="home-section-subtitle">
            Manage labour, projects, attendance, inventory and communication — all from one intelligent platform built for efficiency.
          </Typography>
          <Box className="home-feature-grid">
            {features.map(({ title, description, icon: Icon }) => (
              <Box className="home-feature-card" key={title}>
                <Box className="home-feature-icon"><Icon /></Box>
                <Typography component="h3">{title}</Typography>
                <Typography className="home-feature-description">{description}</Typography>
                <span className="home-card-rule" />
              </Box>
            ))}
          </Box>
          <Box className="home-bottom-cta">
            <Typography component="h2">READY TO STREAMLINE YOUR <span>CONSTRUCTION WORKFLOW?</span></Typography>
            <Typography>Start managing attendance, projects, labour and inventory more efficiently today.</Typography>
            <Button component={Link} to="/signup" variant="contained" className="home-cta">Get Started</Button>
          </Box>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
