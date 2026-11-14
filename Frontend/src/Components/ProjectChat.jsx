import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "../utils/axiosInstance"
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "./atoms/Button/Button";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, IconButton, MenuItem } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function ProjectChat({ projectId, onMessageSent }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [conversations, setConversations] = useState([{ _id: null, name: "Project chat", isDefault: true }]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [groupDialog, setGroupDialog] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [members, setMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    // checking access and making the connection
    useEffect(() => {

    }, []);

    // 🔐 get current user id from JWT
    const token = localStorage.getItem("token");
    if (!token) return null;
    const decoded = jwtDecode(token);
    const currentUserId = decoded.User_id;

    /* -------------------------
       1️⃣ Load old chat messages
    -------------------------- */
    const fetchChats = async (pageNumber = 0,container = null) => {
        if (loading) return;

        try {
            console.log("New load call hit");
            setLoading(true);

            let prevHeight = 0;
            if (container) {
                prevHeight = container.scrollHeight;
            }

            const res = await axiosInstance.get(
                `/chat/${projectId}?page=${pageNumber}&limit=20${activeConversation ? `&conversationId=${activeConversation}` : ""}`
            );

            const newChats = res.data.chats;

            if (pageNumber === 0) {
                setMessages(newChats) //initial load
            } else {
                setMessages(prev => [...newChats, ...prev]);
            }


            // setMessages(res.data.chats);
            if (newChats.length < 20) {
                setHasMore(false);
            }

            if (container) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight - prevHeight;
                }, 0);
            }
            console.log("Show prev mesg", newChats);
        } catch (err) {
            console.error("Failed to load chats:", err);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchChats(0);
    }, [projectId, activeConversation]);

    useEffect(() => {
        let active = true;
        axiosInstance.get(`/chat/${projectId}/conversations`).then(conversationRes => {
            if (!active) return;
            setConversations(conversationRes.data.conversations || []);
            setMembers((conversationRes.data.members || []).filter(member => member._id !== currentUserId));
        }).catch(error => console.error("Unable to load chat groups", error));
        return () => { active = false; };
    }, [projectId, currentUserId]);

    /* -------------------------
       2️⃣ Setup socket connection
    -------------------------- */
    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL, {
            transports: ["websocket"],
            auth: { token: localStorage.getItem("token"), userId: currentUserId },
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Chat socket connected:", socket.id);

            socket.emit("join", {
                projectId,
                organizationId: decoded.organizationId,
                isChat: true,
                conversationId: activeConversation
            });
        });

        socket.on("chat:new", (data) => {
            setMessages((prev) => [...prev, data]);
        });

        socketRef.current.on("project:deleted", (data) => {
            toast.info("Project has been deleted");
            navigate(`/site-engineer/projects`);
        });


        return () => {
            socket.emit("leave", { projectId });
            socket.off("chat:new");
            socket.disconnect();
            socketRef.current = null;
        };
    }, [projectId, activeConversation]);

    /* -------------------------
       3️⃣ Send message
    -------------------------- */
    const sendMessage = () => {
        if (!newMessage.trim()) return;

        socketRef.current.emit("chat:new", {
            projectId,
            senderId: currentUserId,
            message: newMessage,
            conversationId: activeConversation
        });

        setNewMessage("");

        // Notify parent that a message was sent (mark as read)
        if (onMessageSent) {
            onMessageSent();
        }
    };

    const createGroup = async () => {
        try {
            const response = await axiosInstance.post(`/chat/${projectId}/conversations`, { name: groupName, participantIds: selectedMembers });
            const conversation = response.data.conversation;
            setConversations(current => [conversation, ...current]);
            setActiveConversation(conversation._id);
            setGroupDialog(false);
            setGroupName("");
            setSelectedMembers([]);
            toast.success("Group chat created");
        } catch (error) {
            toast.error(error.response?.data?.message || "Unable to create group chat");
        }
    };


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages])


    return (
        <Box sx={{ mt: 3, width: "100%" }}>
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 700,
                    mb: 3,
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                }}
            >
                <Box component="span" sx={{ color: "#111827" }}>
                    Project
                </Box>
                <Box component="span" sx={{ color: "#F97316" }}>
                    Chat
                </Box>
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
                <TextField select size="small" label="Conversation" value={activeConversation || ""} onChange={event => setActiveConversation(event.target.value || null)} sx={{ minWidth: 220 }}>
                    {conversations.map(conversation => <MenuItem key={conversation._id || "default"} value={conversation._id || ""}>{conversation.name}</MenuItem>)}
                </TextField>
                <Box
                    component="button"
                    type="button"
                    aria-label="Add engineers to project group"
                    onClick={() => setGroupDialog(true)}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "#F97316", border: 0, background: "transparent", p: 0 }}
                >
                    <AddCircleOutlineIcon />
                    <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap", color: "#111827" }}>
                        Add engineers to project group
                    </Typography>
                </Box>
            </Box>

            <Box
                sx={{
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                    p: 2,
                    height: 360,
                    overflowY: "auto",
                    mb: 2,
                    backgroundColor: "#f8f1ee",
                    borderRadius: "22px",
                    boxShadow: "inset 0 0 0 1px rgba(249,115,22,0.04)",
                }}
                onScroll={(e) => {
                    const container = e.target;

                    if (container.scrollTop === 0 && hasMore && !loading) {
                        const nextPage = page + 1;
                        setPage(nextPage);

                        fetchChats(nextPage, container);
                    }
                }}
            >
                {!loading && messages.length === 0 && (
                    <Box
                        sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            color: "#4b5563",
                        }}
                    >
                        <Box
                            sx={{
                                width: 78,
                                height: 58,
                                borderRadius: "18px",
                                backgroundColor: "rgba(249, 115, 22, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mb: 2,
                                position: "relative",
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    backgroundColor: "#F97316",
                                    bottom: 18,
                                    left: 24,
                                }}
                            />
                            <Box
                                sx={{
                                    position: "absolute",
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    backgroundColor: "#F97316",
                                    bottom: 18,
                                    left: 35,
                                }}
                            />
                            <Box
                                sx={{
                                    position: "absolute",
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    backgroundColor: "#F97316",
                                    bottom: 18,
                                    left: 46,
                                }}
                            />
                        </Box>

                        <Typography
                            sx={{
                                fontSize: "1.05rem",
                                fontWeight: 600,
                                color: "#111827",
                                mb: 0.5,
                            }}
                        >
                            No messages yet.
                        </Typography>
                        <Typography sx={{ fontSize: "0.95rem", color: "#4b5563" }}>
                            Start the conversation by typing a message.
                        </Typography>
                    </Box>
                )}

                {loading && (
                    <Typography align="center" fontSize={12}>
                        Loading older messages...
                    </Typography>
                )}

                {messages.map((msg) => {
                    const senderId =
                        typeof msg.senderId === "string"
                            ? msg.senderId
                            : msg.senderId?._id;
                    const senderName = typeof msg.senderId === "object" ? msg.senderId?.name : "";

                    const isMine = senderId === currentUserId;
                    const sentAt = msg.createdAt ? new Date(msg.createdAt) : null;
                    const sentAtLabel = sentAt && !Number.isNaN(sentAt.getTime())
                        ? new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                        }).format(sentAt)
                        : "";

                    return (
                        <Box
                            key={msg._id}
                            sx={{
                                display: "flex",
                                justifyContent: isMine ? "flex-end" : "flex-start",
                                mb: 1.5,
                            }}
                        >
                            <Box
                                sx={{
                                    maxWidth: "70%",
                                    px: 2,
                                    py: 1.1,
                                    borderRadius: isMine
                                        ? "18px 18px 5px 18px"
                                        : "18px 18px 18px 5px",
                                    backgroundColor: isMine ? "#F97316" : "#ffffff",
                                    color: isMine ? "#fff" : "#111827",
                                    boxShadow: "0 2px 6px rgba(15,23,42,0.08)",
                                    wordBreak: "break-word",
                                }}
                            >
                                {activeConversation && senderName && (
                                    <Typography
                                        sx={{
                                            mb: 0.35,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: isMine ? "rgba(255,255,255,0.9)" : "#F97316",
                                        }}
                                    >
                                        {senderName}
                                    </Typography>
                                )}
                                <Typography sx={{ fontSize: 14, lineHeight: 1.5 }}>
                                    {msg.message}
                                </Typography>
                                {sentAtLabel && (
                                    <Typography
                                        component="time"
                                        dateTime={sentAt.toISOString()}
                                        sx={{
                                            display: "block",
                                            mt: 0.5,
                                            fontSize: 10,
                                            lineHeight: 1.2,
                                            textAlign: "right",
                                            color: isMine ? "rgba(255,255,255,0.78)" : "#6b7280",
                                        }}
                                    >
                                        {sentAtLabel}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    );
                })}

                <div ref={messagesEndRef}></div>
            </Box>

            <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>Start a project group</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth margin="dense" label="Group name" value={groupName} onChange={event => setGroupName(event.target.value)} inputProps={{ maxLength: 80 }} />
                    <Typography sx={{ mt: 2, mb: 1 }} variant="subtitle2">Add site engineers</Typography>
                    {members.length === 0 && <Typography color="text.secondary">No other assigned site engineers are available for this project.</Typography>}
                    {members.map(member => <FormControlLabel key={member._id} control={<Checkbox checked={selectedMembers.includes(member._id)} onChange={event => setSelectedMembers(current => event.target.checked ? [...current, member._id] : current.filter(id => id !== member._id))} />} label={member.name} />)}
                </DialogContent>
                <DialogActions><Button onClick={() => setGroupDialog(false)}>Cancel</Button><Button variant="contained" disabled={!groupName.trim() || selectedMembers.length === 0} onClick={createGroup}>Create group</Button></DialogActions>
            </Dialog>

            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    border: "1px solid rgba(15, 23, 42, 0.15)",
                    borderRadius: "16px",
                    backgroundColor: "#fff",
                    overflow: "hidden",
                }}
            >
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    variant="outlined"
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 0,
                            backgroundColor: "#fff",
                            "& fieldset": {
                                border: "none",
                            },
                        },
                        "& .MuiInputBase-input": {
                            fontSize: "0.96rem",
                            color: "#111827",
                            padding: "14px 16px",
                        },
                    }}
                />
                <Button
                    variant="contained"
                    onClick={sendMessage}
                    sx={{
                        minWidth: 120,
                        borderRadius: "0 14px 14px 0",
                        backgroundColor: "#F97316",
                        color: "#fff",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        "&:hover": {
                            backgroundColor: "#E65E0C",
                        },
                    }}
                >
                    Send
                </Button>
            </Box>
        </Box>
    );
}

