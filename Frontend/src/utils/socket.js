
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

export const joinProjectRoom = (socket, projectId, { isChat = false } = {}) => {
    if (!socket || !projectId) return () => {};

    const joinRoom = () => socket.emit("join", { projectId, isChat });
    socket.on("connect", joinRoom);

    if (socket.connected) {
        joinRoom();
    }

    return () => {
        socket.off("connect", joinRoom);
        if (socket.connected) socket.emit("leave", { projectId });
    };
};
