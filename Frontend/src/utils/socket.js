
import { io } from "socket.io-client";
import { getIsLogin } from "./authSession";

export const createAuthenticatedSocket = () => {
    if (!getIsLogin()) {
        console.error("Cannot connect Socket.IO: user is not logged in.");
        return null;
    }

    const socket = io(import.meta.env.VITE_API_URL, {
        transports: ["websocket"],
        // The browser sends the HTTP-only auth cookie with the handshake.
        withCredentials: true
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
