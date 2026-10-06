import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
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
            localStorage.removeItem("token");
            localStorage.removeItem("User_id");
            localStorage.removeItem("IsLogin");
            localStorage.removeItem("name");
            localStorage.removeItem("organizationId");
            const role = localStorage.getItem("role");
            localStorage.removeItem("role");
            // Only redirect if a token was sent (session expired), not on login failure
            if (error.config.headers.Authorization) {
                toast.error("Session expired. Please login again.");
                if (role === "admin") {
                    window.location.href = "/admin/login";
                } else {
                    window.location.href = "/";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
