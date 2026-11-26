import axios from "axios";
import { toast } from "react-toastify";
import { clearAuthSession, getCurrentRole, getToken } from "./authSession";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
}
)

// response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            console.log("Got an hit",error)
            // Read the role before the Redux auth state is reset.
            const role = getCurrentRole();
            const sessionCleared = clearAuthSession();
            // Only redirect if a token was sent (session expired), not on login failure
            if (error.config?.headers?.Authorization) {
                toast.error("Session expired. Please login again.");
                // Redirect only after the reset auth state has been written to storage.
                sessionCleared.finally(() => {
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
