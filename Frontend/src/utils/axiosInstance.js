import axios from "axios";
import { popupToast as toast } from "./popupToast.js";
import { clearSiteEngineerProfileCache } from "./siteEngineerProfileCache";
import { clearLastVisitedProjectTabs } from "./projectDetailsTabStorage";
import { clearAuthSession, getCurrentRole, getIsLogin } from "./authSession";

// The JWT lives in an HTTP-only cookie set by the backend. withCredentials lets
// the browser send it on cross-origin API requests; no Authorization header is
// attached and the token is never read by JavaScript.
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

// Set once the first 401 starts the session-expired flow, so that several
// requests failing at the same time trigger only one toast and one redirect.
// The redirect reloads the page, which resets this flag.
let isHandlingSessionExpiry = false;

// response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            console.log("Got an hit",error)
            // Treat a 401 as an expired session only when the user was logged in.
            // Login failures happen while logged out, and requests flagged with
            // skipSessionExpiredHandling (session restore, logout, logins)
            // handle their own 401.
            const shouldHandle =
                !error.config?.skipSessionExpiredHandling &&
                getIsLogin() &&
                !isHandlingSessionExpiry;

            if (shouldHandle) {
                isHandlingSessionExpiry = true;
                // Read the role before the Redux auth state is reset.
                const role = getCurrentRole();
                toast.error("Session expired. Please login again.");
                // Redirect only after the reset auth state has been written to storage.
                clearAuthSession().finally(() => {
                    if (role === "admin") {
                        window.location.href = "/admin/login";
                    } else {
                        window.location.href = "/";
                    }
                });
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
