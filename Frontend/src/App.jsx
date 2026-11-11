import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminRoute from "./utils/AdminRoute";
import { onForegroundMessage, resolveNotificationUrl } from "./services/notificationService";
import PopupProvider from "./contexts/PopupProvider";
import Popup from "./Components/atoms/Popup/Popup";
import usePopup from "./contexts/usePopup";

const Home = lazy(() => import("./Screen/Home"));
const Login = lazy(() => import("./Screen/Login"));

const OrganizationProfile = lazy(() => import("./Screen/Founder/OrganizationProfile"));
const Project = lazy(() => import("./Screen/Founder/Project"));
const ProjectDetails = lazy(() => import("./Screen/Founder/ProjectDetails"));
const AddProject = lazy(() => import("./Screen/Founder/AddProject"));
const ViewReport = lazy(() => import("./Screen/Founder/ViewReport"));
const FounderAttendance = lazy(() => import("./Screen/Founder/FounderAttendance"));
const AddWorker = lazy(() => import("./Screen/Founder/AddWorkers"));
const FounderWorkers = lazy(() => import("./Screen/Founder/FounderWorkers"));
const AssignWorker = lazy(() => import("./Screen/Founder/AssignWorker"));
const ProjectInventory = lazy(() => import("./Screen/Founder/ProjectInventory"));
const InventoryHistory = lazy(() => import("./Screen/Founder/InventoryHistory"));
import ActivateAccount from './Screen/ActivateAccount'
const Dashboard = lazy(() => import("./Screen/Dashboard"));
const MyProjects = lazy(() => import("./Screen/SiteEngineer/MyProjects"));
const SubmitReport = lazy(() => import("./Screen/SiteEngineer/SubmitReport"));
const Attendance = lazy(() => import("./Screen/SiteEngineer/Attendance"));
const InventoryUsage = lazy(() => import("./Screen/SiteEngineer/InventoryUsage"));

const Services = lazy(() => import("./Screen/Services"));

const AdminDashboard = lazy(() =>
  import("./Screen/Admin/admin dashboard/Dashboard")
);

const SignInSide = lazy(() =>
  import("./Screen/Admin/admin-signin-mui/signin-mui/SignInSide")
);

const NotFound = lazy(() => import("./Components/NotFound"));

// suspense loader and errorboundary
import FullScreenLoader from "./Components/FullScreenLoader";
import ErrorBoundary from "./Components/ErrorBoundary";
import AppLayout from "./Components/AppLayout";

function NotificationHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Listen for background notification clicks sent via postMessage from Service Worker
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === "NOTIFICATION_CLICK") {
        const url = event.data.url;
        if (url) {
          try {
            const parsed = new URL(url, window.location.origin);
            if (parsed.origin === window.location.origin) {
              navigate(parsed.pathname + parsed.search + parsed.hash);
            } else {
              window.location.href = url;
            }
          } catch {
            navigate(url);
          }
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    // 2. Listen for push notifications while the app is in the foreground
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "ODRAOPS Notification";
      const body = payload.notification?.body || payload.data?.body || "";
      const targetUrl = resolveNotificationUrl(payload.data);

      toast.info(
        <div style={{ cursor: "pointer" }}>
          <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
          <div>{body}</div>
        </div>,
        {
          onClick: () => {
            if (targetUrl) {
              navigate(targetUrl);
            }
          }
        }
      );
    });

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  return null;
}

function RouteBackground() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isDashboardRoute =
      pathname.startsWith("/founder/") ||
      pathname === "/founder" ||
      pathname === "/site-engineer/home" ||
      pathname.startsWith("/site-engineer/");

    document.body.classList.toggle("has-dashboard-background", isDashboardRoute);
    return () => document.body.classList.remove("has-dashboard-background");
  }, [pathname]);

  return null;
}

function GlobalPopup() {
  const { popup, dismissPopup } = usePopup();

  if (!popup) return null;

  return (
    <div className="popup-host">
      <Popup {...popup} onClose={dismissPopup} style={{ maxWidth: "100%" }} />
    </div>
  );
}

function ProtectedRoleLayout() {
  const { pathname, search, hash } = useLocation();
  const hasToken = Boolean(localStorage.getItem("token"));
  const role = localStorage.getItem("role");
  const expectedRole = pathname.startsWith("/site-engineer") ? "Site Engineer" : "Founder";

  if (!hasToken || role !== expectedRole) {
    const requestedPath = `${pathname}${search}${hash}`;
    return <Navigate to={`/Login?redirect=${encodeURIComponent(requestedPath)}`} replace />;
  }

  return <AppLayout />;
}

function App() {
  return (
    <BrowserRouter>
      <PopupProvider>
      <GlobalPopup />
      <RouteBackground />
      {/* Handles notification click events and foreground messages */}
      <NotificationHandler />

      {/* ✅ ToastContainer should be here, once, globally */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      {/* ✅ Your routes below */}
      <ErrorBoundary>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            {/* <Route path="/Signup" element={<Signup />} /> */}
            <Route path="/Login" element={<Login />} />
            <Route path="/reset-password" element={<Login />} />
            <Route element={<ProtectedRoleLayout />}>
              <Route path="/founder/home" element={<Dashboard />} />
              <Route path="/founder/organization-profile" element={<OrganizationProfile />} />
              <Route path="/founder/edit-organization-profile" element={<OrganizationProfile />} />
              <Route path="/organization-profile" element={<OrganizationProfile />} />
              <Route path="/founder/project" element={<Project />} />
              <Route path="/founder/project/:id" element={<ProjectDetails />} />
              <Route path="/founder/add-project" element={<AddProject />} />
              <Route path="/founder/view-report/:id" element={<ViewReport />} />
              <Route path="/founder/projects/:id/inventory" element={<ProjectInventory />} />
              <Route path="/founder/projects/:id/inventory-history" element={<InventoryHistory />} />
              <Route path="/founder/projects/:id/attendance" element={<FounderAttendance />} />
              <Route path="/founder/workers" element={<FounderWorkers />} />
              <Route path="/founder/add-worker" element={<AddWorker />} />
              <Route path="/founder/projects/:id/assign-workers" element={<AssignWorker />} />
              <Route path="/site-engineer/home" element={<Dashboard />} />
              <Route path="/site-engineer/projects" element={<MyProjects></MyProjects>} />
              <Route path="/site-engineer/projects/:id" element={<ProjectDetails isSiteEngineer />} />
              <Route path='/site-engineer/projects/:id/report' element={<SubmitReport />}></Route>
              <Route path="/site-engineer/projects/:id/attendance" element={<Attendance />} />
              <Route path="/site-engineer/projects/:id/inventory" element={<InventoryUsage />} />
            </Route>
            <Route
              path="/activate-account"
              element={<ActivateAccount />}
            />
            {/* site engineer routes */}
            {/* common pages routes */}
            <Route path="/services" element={<Services />} />

            {/* Attendance Route */}

            {/* Admin Routes */}
            <Route path="/admin/login" element={<SignInSide />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* 404 page */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </Suspense>
      </ErrorBoundary>
      </PopupProvider>
    </BrowserRouter>
  )
}

export default App
