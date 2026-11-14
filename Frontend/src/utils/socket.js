
import { io } from "socket.io-client";

export const createAuthenticatedSocket = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        console.error("Cannot connect Socket.IO: JWT token not found.");
        return null;
    }

    const socket = io(import.meta.env.VITE_API_URL, {
        transports: ["websocket"],
        auth: {
            token
        }
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });

    return socket;
};
