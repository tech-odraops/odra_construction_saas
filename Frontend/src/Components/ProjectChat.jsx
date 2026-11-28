import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "../utils/axiosInstance"
import { useSelector } from "react-redux";
import { selectUserId } from "../redux/slices/authSlice";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "./atoms/Button/Button";
import { useNavigate } from "react-router-dom";
import { popupToast as toast } from "../utils/popupToast.js";
import { Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, IconButton, MenuItem, Menu } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import MicNoneIcon from "@mui/icons-material/MicNone";
import CheckDoubleIcon from "@mui/icons-material/DoneAll";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VideoFileOutlinedIcon from "@mui/icons-material/VideoFileOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import { getAssets } from "../services/assetService";

const getPinKey = (conversation) => String(conversation?._id || "project-chat");
const CHAT_PAGE_SIZE = 10;

const getPinKey = (conversation) => String(conversation?._id || "project-chat");
const dedupeConversations = (items = []) => {
    const seen = new Set();
    return items.filter((conversation) => {
        const key = getPinKey(conversation);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export default function ProjectChat({ projectId, participants = [], onMessageSent, socket }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [conversations, setConversations] = useState([{ _id: null, name: "Project chat", isDefault: true }]);
    const [unreadByConversation, setUnreadByConversation] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`chat-unread-${projectId}`) || "{}"); }
        catch { return {}; }
    });
    const [activeConversation, setActiveConversation] = useState(null);
    const [groupDialog, setGroupDialog] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [exitingGroup, setExitingGroup] = useState(false);
    const [members, setMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
    const [galleryAssets, setGalleryAssets] = useState([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const attachmentInputRef = useRef(null);
    const [attachmentKind, setAttachmentKind] = useState("image");
    const [searchText, setSearchText] = useState("");
    const [chatMenuAnchor, setChatMenuAnchor] = useState(null);
    const [listMenuAnchor, setListMenuAnchor] = useState(null);
    const [pinnedConversations, setPinnedConversations] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`chat-pins-${projectId}`) || "[]").slice(0, 1); }
        catch { return []; }
    });
    const creatingGroupRef = useRef(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    // 🔐 current user id from Redux (the JWT is in an HTTP-only cookie)
    const authUserId = useSelector(selectUserId);
    const currentUserId = authUserId ? String(authUserId) : "";

    const markActiveMessagesRead = async () => {
        if (!projectId || !currentUserId) return;
        try {
            const response = await axiosInstance.post(`/chat/${projectId}/read`, {
                conversationId: activeConversation || null
            });
            const readIds = new Set((response.data.messageIds || []).map(String));
            if (!readIds.size) return;
            setMessages(current => current.map(message => readIds.has(String(message._id))
                ? { ...message, readBy: [...new Set([...(message.readBy || []).map(String), currentUserId])] }
                : message));
        } catch (error) {
            console.error("Could not mark chat messages as read:", error);
        }
    };

    /* -------------------------
       1️⃣ Load old chat messages
    -------------------------- */
    const fetchChats = async (pageNumber = 0,container = null) => {
        if (loading || !projectId) return;

        try {
            console.log("New load call hit");
            setLoading(true);

            let prevHeight = 0;
            if (container) {
                prevHeight = container.scrollHeight;
            }

            const res = await axiosInstance.get(
                `/chat/${projectId}?page=${pageNumber}&limit=${CHAT_PAGE_SIZE}${activeConversation ? `&conversationId=${activeConversation}` : ""}`
            );

            const newChats = Array.isArray(res.data.chats) ? res.data.chats : [];

            if (pageNumber === 0) {
                setMessages(newChats) //initial load
            } else {
                setMessages(prev => [...newChats, ...prev]);
            }
            markActiveMessagesRead();


            // setMessages(res.data.chats);
            if (newChats.length < CHAT_PAGE_SIZE) {
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
            const loadedConversations = dedupeConversations(conversationRes.data.conversations || []);
            setConversations(loadedConversations);
            setUnreadByConversation((current) => {
                const serverCounts = Object.fromEntries(loadedConversations.map((conversation) => [
                    getPinKey(conversation), Number(conversation.unreadCount ?? conversation.unreadMessagesCount ?? conversation.unreadMessages ?? 0)
                ]).filter(([, count]) => count > 0));
                return { ...serverCounts, ...current };
            });
            setMembers((conversationRes.data.members || []).filter(member => member._id !== currentUserId));
        }).catch(error => console.error("Unable to load chat groups", error));
        return () => { active = false; };
    }, [projectId, currentUserId]);

    useEffect(() => {
        try {
            const savedPins = JSON.parse(localStorage.getItem(`chat-pins-${projectId}`) || "[]").slice(0, 1);
            setPinnedConversations(savedPins);
            localStorage.setItem(`chat-pins-${projectId}`, JSON.stringify(savedPins));
        }
        catch { setPinnedConversations([]); }
    }, [projectId]);

    useEffect(() => {
        try { localStorage.setItem(`chat-unread-${projectId}`, JSON.stringify(unreadByConversation)); }
        catch { /* local storage may be unavailable */ }
    }, [projectId, unreadByConversation]);

    const togglePinnedConversation = () => {
        const conversationId = activeConversation ? String(activeConversation) : getPinKey(activeChat);
        setPinnedConversations((current) => {
            const next = current.includes(conversationId) ? [] : [conversationId];
            try { localStorage.setItem(`chat-pins-${projectId}`, JSON.stringify(next)); } catch { /* local storage may be unavailable */ }
            return next;
        });
        setChatMenuAnchor(null);
    };

    const toggleConversationPin = (conversationId) => {
        if (!conversationId) return;
        const id = String(conversationId);
        setPinnedConversations((current) => {
            const next = current.includes(id) ? [] : [id];
            try { localStorage.setItem(`chat-pins-${projectId}`, JSON.stringify(next)); } catch { /* local storage may be unavailable */ }
            return next;
        });
    };

    const exitActiveGroup = async () => {
        if (!activeConversation || exitingGroup) return;
        setExitingGroup(true);
        try {
            await axiosInstance.delete(`/chat/${projectId}/conversations/${activeConversation}/leave`);
            setConversations((current) => current.filter((conversation) => String(conversation._id) !== String(activeConversation)));
            setPinnedConversations((current) => {
                const next = current.filter((id) => id !== String(activeConversation));
                try { localStorage.setItem(`chat-pins-${projectId}`, JSON.stringify(next)); } catch { /* local storage may be unavailable */ }
                return next;
            });
            setUnreadByConversation((current) => {
                const next = { ...current };
                delete next[String(activeConversation)];
                try { localStorage.setItem(`chat-unread-${projectId}`, JSON.stringify(next)); } catch { /* local storage may be unavailable */ }
                return next;
            });
            setActiveConversation(null);
            setChatMenuAnchor(null);
            toast.success("You left the group");
        } catch (error) {
            toast.error(error.response?.data?.message || "Unable to leave this group");
        } finally {
            setExitingGroup(false);
        }
    };

    /* -------------------------
       2️⃣ Setup socket connection
    -------------------------- */
    useEffect(() => {
        if (!socket || !projectId) return undefined;

        const handleNewMessage = (data) => {
            if (String(data?.projectId) !== String(projectId)) return;
            const messageConversationId = String(data?.conversationId || "");
            const activeConversationId = String(activeConversation || "");
            const senderId = typeof data?.senderId === "string" ? data.senderId : data?.senderId?._id;
            if (messageConversationId !== activeConversationId && String(senderId || "") !== currentUserId) {
                const key = messageConversationId || "project-chat";
                setUnreadByConversation((current) => ({ ...current, [key]: (current[key] || 0) + 1 }));
            }
            if (messageConversationId !== activeConversationId) return;
            setMessages((prev) => {
                const messageId = data?._id;
                if (messageId && prev.some((message) => String(message._id) === String(messageId))) return prev;
                return [...prev, data];
            });
            if (String(senderId || "") !== currentUserId) markActiveMessagesRead();
        };

        const handleChatRead = ({ projectId: readProjectId, conversationId, messageIds = [], readerId } = {}) => {
            if (String(readProjectId) !== String(projectId) || !messageIds.length) return;
            const readIdSet = new Set(messageIds.map(String));
            setMessages(current => current.map(message => readIdSet.has(String(message._id))
                ? { ...message, readBy: [...new Set([...(message.readBy || []).map(String), String(readerId)])] }
                : message));
        };

        const handleProjectDeleted = () => {
            toast.info("Project has been deleted");
            navigate(`/site-engineer/projects`);
        };
        socket.on("chat:new", handleNewMessage);
        socket.on("chat:read", handleChatRead);
        const handleChatError = (error) => toast.error(error?.message || "Message could not be sent.");
        socket.on("chat:error", handleChatError);
        socket.on("project:deleted", handleProjectDeleted);


        return () => {
            socket.off("chat:new", handleNewMessage);
            socket.off("chat:read", handleChatRead);
            socket.off("chat:error", handleChatError);
            socket.off("project:deleted", handleProjectDeleted);
        };
    }, [projectId, activeConversation, navigate, socket]);

    /* -------------------------
       3️⃣ Send message
    -------------------------- */
    const sendMessage = () => {
        if (!newMessage.trim()) return;

        if (!socket?.connected) {
            toast.error("Chat connection is unavailable.");
            return;
        }

        socket.emit("chat:new", {
            projectId,
            senderId: currentUserId,
            message: newMessage.trim(),
            conversationId: activeConversation
        });

        setNewMessage("");

        // Notify parent that a message was sent (mark as read)
        if (onMessageSent) {
            onMessageSent();
        }
    };

    const loadGalleryAssets = async () => {
        setGalleryLoading(true);
        try {
            const response = await getAssets({ projectId, assetType: "image", page: 1, limit: 100 });
            setGalleryAssets(response.assets || []);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not load project gallery photos.");
        } finally {
            setGalleryLoading(false);
        }
    };

    const uploadChatAttachment = async (file = null, assetId = null) => {
        setUploadingAttachments(true);
        try {
            const formData = new FormData();
            if (file) formData.append("file", file);
            if (assetId) formData.append("assetId", assetId);
            if (activeConversation) formData.append("conversationId", activeConversation);
            if (newMessage.trim()) formData.append("message", newMessage.trim());
            const response = await axiosInstance.post(`/chat/${projectId}/attachments`, formData);
            const chatMessage = response.data.chat;
            if (!chatMessage?._id) throw new Error("Upload succeeded but the server returned no chat message.");
            setMessages((current) => current.some((item) => String(item._id) === String(chatMessage._id)) ? current : [...current, chatMessage]);
            setNewMessage("");
            setAttachmentDialogOpen(false);
            onMessageSent?.();
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not send this attachment.");
        } finally {
            setUploadingAttachments(false);
        }
    };

    const openAttachmentPicker = (kind) => {
        setAttachmentKind(kind);
        setAttachmentDialogOpen(false);
        window.setTimeout(() => attachmentInputRef.current?.click(), 0);
    };

    const handleAttachmentFiles = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;
        const allowedExtensions = attachmentKind === "image"
            ? [".jpg", ".jpeg", ".png", ".webp"]
            : attachmentKind === "video"
                ? [".mp3", ".mp4", ".webm"]
                : [".pdf", ".doc", ".docx", ".xls"];
        const validFiles = files.filter((file) => {
            const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
            const sizeLimit = attachmentKind === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            return allowedExtensions.includes(extension) && file.size <= sizeLimit;
        });
        if (validFiles.length !== files.length) {
            toast.error(attachmentKind === "video"
                ? "Choose MP3, MP4, or WEBM files up to 50 MB."
                : "Some files are unsupported or exceed the 10 MB limit.");
        }
        for (const file of validFiles) await uploadChatAttachment(file);
    };

    const createGroup = async () => {
        if (creatingGroupRef.current) return;
        creatingGroupRef.current = true;
        setCreatingGroup(true);

        try {
            const response = await axiosInstance.post(`/chat/${projectId}/conversations`, { name: groupName, participantIds: selectedMembers });
            const conversation = response.data.conversation;
            setConversations((current) => dedupeConversations([conversation, ...current]));
            setUnreadByConversation((current) => ({ ...current, [getPinKey(conversation)]: 0 }));
            setActiveConversation(conversation._id);
            setGroupDialog(false);
            setGroupName("");
            setSelectedMembers([]);
            toast.success("Group chat created");
        } catch (error) {
            toast.error(error.response?.data?.message || "Unable to create group chat");
        } finally {
            creatingGroupRef.current = false;
            setCreatingGroup(false);
        }
    };


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages])


    const projectChat = conversations.find((conversation) => !conversation._id || conversation.isDefault) || { _id: null, name: "Project chat", isDefault: true };
    const activeChat = activeConversation
        ? conversations.find((conversation) => String(conversation._id || "") === String(activeConversation)) || projectChat
        : projectChat;
    const visibleConversations = dedupeConversations(conversations.some((conversation) => !conversation._id || conversation.isDefault)
        ? conversations
        : [projectChat, ...conversations]);
    const filteredConversations = visibleConversations
        .filter((conversation) => conversation.name?.toLowerCase().includes(searchText.toLowerCase()))
        .sort((a, b) => Number(pinnedConversations.includes(getPinKey(b))) - Number(pinnedConversations.includes(getPinKey(a))));
    const getConversationMessages = (conversation) => messages.filter((message) => !conversation?._id || String(message.conversationId || "") === String(conversation._id));
    const latestMessage = (conversation) => getConversationMessages(conversation).at(-1);

    return (
        <Box sx={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: { xs: "190px minmax(0, 1fr)", sm: "265px minmax(0, 1fr)" }, bgcolor: "#fff", color: "#354052", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
            <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #edf0f4", bgcolor: "#fff" }}>
                <Box sx={{ height: 58, flexShrink: 0, display: "flex", alignItems: "center", gap: 0.7, px: 1.4, borderBottom: "1px solid #f0f1f3" }}>
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, px: 1.1, height: 36, bgcolor: "#f6f6f6", border: "1px solid #e4e5e7", borderRadius: "8px" }}>
                        <SearchIcon sx={{ fontSize: 17, color: "#858b92" }} />
                        <TextField value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search or start a new chat" variant="standard" InputProps={{ disableUnderline: true }} sx={{ minWidth: 0, flex: 1, "& input": { p: 0, fontSize: 12, fontWeight: 600, color: "#626a74" } }} />
                    </Box>
                    <IconButton aria-label="Conversation list options" aria-controls={listMenuAnchor ? "conversation-list-menu" : undefined} aria-haspopup="true" aria-expanded={listMenuAnchor ? "true" : undefined} onClick={(event) => setListMenuAnchor(event.currentTarget)} size="small" sx={{ color: "#858b92" }}><MoreVertIcon fontSize="small" /></IconButton>
                    <Menu id="conversation-list-menu" anchorEl={listMenuAnchor} open={Boolean(listMenuAnchor)} onClose={() => setListMenuAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} PaperProps={{ sx: { mt: 0.5, minWidth: 150, p: 0.35, borderRadius: "8px", bgcolor: "#f7f7f7", boxShadow: "0 3px 12px rgba(30,40,55,0.16)" } }}>
                        <MenuItem onClick={() => { setListMenuAnchor(null); setGroupDialog(true); }} sx={{ minHeight: 38, gap: 0.8, borderRadius: "7px", px: 0.9, fontSize: 12, fontWeight: 600, color: "#555b62", "&:hover": { bgcolor: "#eeeeef" } }}><GroupAddOutlinedIcon sx={{ fontSize: 19, color: "#858b92" }} />New Group</MenuItem>
                    </Menu>
                </Box>
                <Box sx={{ flex: 1, overflowY: "auto", p: 0.7 }}>
                    {filteredConversations.map((conversation, index) => {
                        const selected = String(conversation._id || "") === String(activeConversation || "");
                        const isPinned = pinnedConversations.includes(getPinKey(conversation));
                        const recent = latestMessage(conversation);
                        const preview = recent?.message || recent?.attachments?.[0]?.originalName || (conversation.isDefault ? "Start a conversation" : "Group conversation");
                        const avatarColor = ["#ffede6", "#e7e8e9", "#e9ebec", "#fff0e9"][index % 4];
                        const unreadCount = unreadByConversation[getPinKey(conversation)] || 0;
                        const selectConversation = () => {
                            setActiveConversation(conversation._id || null);
                            setUnreadByConversation((current) => ({ ...current, [getPinKey(conversation)]: 0 }));
                        };
                        return <Box key={conversation._id || "default"} component="div" role="button" tabIndex={0} onClick={selectConversation} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectConversation(); } }} sx={{ width: "100%", border: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 1, p: 0.8, mb: 0.45, borderRadius: "9px", bgcolor: selected ? "#fff2ed" : "transparent", cursor: "pointer", "&:hover": { bgcolor: selected ? "#fff2ed" : "#f8f8f8" } }}>
                            <Box sx={{ flex: "0 0 34px", width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: avatarColor, color: "#555b62", fontSize: 13, fontWeight: 700 }}>{conversation.name?.slice(0, 1)?.toUpperCase() || "G"}</Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5, color: "#424850" }}>{conversation.name || "Project chat"}</Typography>
                                <Typography noWrap sx={{ fontSize: 10, color: "#697586", lineHeight: 1.45 }}>{preview}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 29, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 0.25 }}>
                                {recent?.createdAt && <Typography sx={{ whiteSpace: "nowrap", fontSize: 8, lineHeight: 1.2, color: "#697586" }}>{new Date(recent.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Typography>}
                                <Box sx={{ minHeight: 12, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.45 }}>
                                    {isPinned && <PushPinOutlinedIcon aria-label={`Pinned ${conversation.name}`} sx={{ fontSize: 12, color: "#697586", transform: "rotate(35deg)" }} />}
                                    {unreadCount > 0 && <Box aria-label={`${unreadCount} unread messages`} sx={{ minWidth: 11, height: 11, px: 0.25, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "#32b51e", color: "white", fontSize: 7, lineHeight: 1, fontWeight: 700 }}>{unreadCount > 99 ? "99+" : unreadCount}</Box>}
                                </Box>
                            </Box>
                        </Box>;
                    })}
                </Box>
            </Box>

            <Box sx={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "#fff" }}>
                <Box sx={{ height: 58, flexShrink: 0, px: 1.5, display: "flex", alignItems: "center", gap: 1.2, bgcolor: "#f7f7f7", borderBottom: "1px solid #f1f1f1" }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: "#ffede6", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "#555b62" }}>{activeChat.name?.slice(0, 1)?.toUpperCase() || "G"}</Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: "#424850" }}>{activeChat.name}</Typography>
                        <Typography noWrap sx={{ fontSize: 10, lineHeight: 1.3, color: "#758094" }}>{participants.map((person) => typeof person === "string" ? "" : person?.name).filter(Boolean).slice(0, 4).join(", ") || "Project members"}</Typography>
                    </Box>
                    <IconButton aria-label="Chat options" aria-controls={chatMenuAnchor ? "chat-options-menu" : undefined} aria-haspopup="true" aria-expanded={chatMenuAnchor ? "true" : undefined} onClick={(event) => setChatMenuAnchor(event.currentTarget)} size="small" sx={{ color: "#7d838a" }}><MoreVertIcon /></IconButton>
                    <Menu id="chat-options-menu" anchorEl={chatMenuAnchor} open={Boolean(chatMenuAnchor)} onClose={() => setChatMenuAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} PaperProps={{ sx: { mt: 0.5, minWidth: 138, p: 0.35, borderRadius: "8px", bgcolor: "#f7f7f7", boxShadow: "0 3px 12px rgba(30,40,55,0.16)" } }}>
                        <MenuItem onClick={() => setChatMenuAnchor(null)} sx={{ minHeight: 36, gap: 0.8, borderRadius: "7px", px: 0.9, fontSize: 12, fontWeight: 600, color: "#555b62", "&:hover": { bgcolor: "#eeeeef" } }}><PersonAddAltOutlinedIcon sx={{ fontSize: 18, color: "#858b92" }} />Add member</MenuItem>
                        {(pinnedConversations.includes(activeConversation ? String(activeConversation) : getPinKey(activeChat)) || pinnedConversations.length === 0) && <MenuItem onClick={togglePinnedConversation} sx={{ minHeight: 36, gap: 0.8, borderRadius: "7px", px: 0.9, fontSize: 12, fontWeight: 600, color: "#555b62", "&:hover": { bgcolor: "#eeeeef" } }}><PushPinOutlinedIcon sx={{ fontSize: 18, color: "#858b92" }} />{pinnedConversations.includes(activeConversation ? String(activeConversation) : getPinKey(activeChat)) ? "Unpin group" : "Pin group"}</MenuItem>}
                        <MenuItem disabled={!activeConversation || activeChat.isDefault || exitingGroup} onClick={exitActiveGroup} sx={{ minHeight: 36, gap: 0.8, borderRadius: "7px", px: 0.9, fontSize: 12, fontWeight: 600, color: "#555b62", bgcolor: "#ffe2e2", "&:hover": { bgcolor: "#ffd6d6" } }}><LogoutOutlinedIcon sx={{ fontSize: 18, color: "#858b92" }} />{exitingGroup ? "Exiting..." : "Exit group"}</MenuItem>
                    </Menu>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", p: { xs: 1.3, sm: 2 }, gap: 1.1, bgcolor: "#fff" }}
                    onScroll={(event) => {
                        const container = event.currentTarget;
                        if (container.scrollTop === 0 && hasMore && !loading) {
                            const nextPage = page + 1;
                            setPage(nextPage);
                            fetchChats(nextPage, container);
                        }
                    }}>
                    {loading && <Typography align="center" sx={{ fontSize: 10, color: "#758094" }}>Loading messages...</Typography>}
                    {!loading && messages.length === 0 && <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "#758094", fontSize: 12 }}>No messages yet. Start the conversation.</Box>}
                    {messages.map((msg) => {
                        const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
                        const hasBeenRead = (msg.readBy || []).some(reader => String(typeof reader === "string" ? reader : reader?._id) !== String(senderId || ""));
                        const sentAt = msg.createdAt ? new Date(msg.createdAt) : null;
                        const isMine = String(senderId || "") === currentUserId;
                        const participant = participants.find((member) => String((typeof member === "string" ? member : member?._id) || "") === String(senderId || ""));
                        const senderName = msg.senderId?.name || msg.senderName || participant?.name;
                        const time = sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
                        return <Box key={msg._id} sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                            <Box sx={{ maxWidth: "76%", px: 1.5, py: 1, borderRadius: isMine ? "14px 14px 5px 14px" : "14px 14px 14px 5px", bgcolor: isMine ? "#fff1eb" : "#f0f1f2", color: "#46505c", boxShadow: "0 1px 2px rgba(20,30,45,0.12)", overflowWrap: "anywhere" }}>
                                {!isMine && senderId && <Typography sx={{ fontSize: 10, fontWeight: 700, mb: 0.25 }}>{senderName || "Project member"}</Typography>}
                                {msg.message && <Typography sx={{ fontSize: 11, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{msg.message}</Typography>}
                                {(msg.attachments || []).map((attachment, index) => (
                                    <Box key={`${msg._id}-attachment-${index}`} sx={{ mt: msg.message || index ? 0.8 : 0, maxWidth: 340 }}>
                                        {attachment.kind === "image" && attachment.url && <Box component="img" src={attachment.url} alt={attachment.originalName || "Chat image"} sx={{ display: "block", maxWidth: "100%", maxHeight: 260, borderRadius: "8px", objectFit: "contain" }} />}
                                        {attachment.kind === "video" && attachment.url && <Box component="video" src={attachment.url} controls preload="metadata" sx={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: "8px" }} />}
                                        {attachment.kind === "audio" && attachment.url && <Box component="audio" src={attachment.url} controls preload="metadata" sx={{ display: "block", maxWidth: "100%" }} />}
                                        {attachment.kind === "file" && attachment.url && <Box component="a" href={attachment.url} target="_blank" rel="noreferrer" sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "inherit", fontSize: 11, textDecoration: "underline", overflowWrap: "anywhere" }}><DescriptionOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />{attachment.originalName || "Download document"}</Box>}
                                    </Box>
                                ))}
                                {time && <Typography component="time" dateTime={sentAt.toISOString()} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.3, mt: 0.25, fontSize: 8, lineHeight: 1, color: "#7d8794" }}>{time}{isMine && <CheckDoubleIcon aria-label={hasBeenRead ? "Read" : "Sent"} sx={{ fontSize: 12, color: hasBeenRead ? "#34b7f1" : "#8a9691" }} />}</Typography>}
                            </Box>
                        </Box>;
                    })}
                    <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ flexShrink: 0, mx: 1.2, mb: 1.2, minHeight: 38, display: "flex", alignItems: "center", gap: 0.7, border: "1px solid #d9d9dc", borderRadius: "11px", bgcolor: "#fafafa", px: 0.7 }}>
                    <IconButton type="button" aria-label="Add attachment" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setAttachmentDialogOpen(true); }} size="small" sx={{ color: "#7e8389" }}><AddIcon /></IconButton>
                    <input ref={attachmentInputRef} hidden type="file" multiple accept={attachmentKind === "image" ? "image/jpeg,image/png,image/webp" : attachmentKind === "video" ? "audio/mpeg,.mp3,video/mp4,video/webm" : ".pdf,.doc,.docx,.xls"} onChange={handleAttachmentFiles} />
                    <TextField fullWidth size="small" placeholder="Type a message..." value={newMessage} onChange={(event) => setNewMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} variant="standard" InputProps={{ disableUnderline: true }} sx={{ "& input": { py: 0.8, fontSize: 10, color: "#424850" } }} />
                    <IconButton aria-label="Voice message" size="small" sx={{ color: "#858b92" }}><MicNoneIcon fontSize="small" /></IconButton>
                </Box>
            </Box>

            <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>Start a project group</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth margin="dense" label="Group name" value={groupName} onChange={event => setGroupName(event.target.value)} inputProps={{ maxLength: 80 }} />
                    <Typography sx={{ mt: 2, mb: 1 }} variant="subtitle2">Add site engineers</Typography>
                    {members.length === 0 && <Typography color="text.secondary">No other assigned site engineers are available for this project.</Typography>}
                    {members.map(member => <FormControlLabel key={member._id} control={<Checkbox checked={selectedMembers.includes(member._id)} onChange={event => setSelectedMembers(current => event.target.checked ? [...current, member._id] : current.filter(id => id !== member._id))} />} label={member.name} />)}
                </DialogContent>
                <DialogActions><Button onClick={() => setGroupDialog(false)}>Cancel</Button><Button variant="contained" disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0} onClick={createGroup}>{creatingGroup ? "Creating..." : "Create group"}</Button></DialogActions>
            </Dialog>

            <Dialog open={attachmentDialogOpen} onClose={() => !uploadingAttachments && setAttachmentDialogOpen(false)} fullWidth maxWidth="xs"
                PaperProps={{ sx: { maxWidth: 390, borderRadius: "20px", p: 0.5, bgcolor: "#fff", boxShadow: "0 24px 80px rgba(20,35,48,.24)" } }}>
                <DialogTitle sx={{ px: 2.5, pt: 2.3, pb: 0.4, fontSize: 17, fontWeight: 750, letterSpacing: "-.02em", color: "#172b2a" }}>Share with your chat</DialogTitle>
                <Typography sx={{ px: 2.5, pb: 1.8, fontSize: 12, color: "#788582" }}>Choose what you want to send</Typography>
                <DialogContent sx={{ px: 2.2, pt: 0, pb: 2.3 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
                        {[
                            { title: "Photos", detail: "From your device", icon: <ImageOutlinedIcon />, color: "#168c72", bg: "#e5f5ee", action: () => openAttachmentPicker("image") },
                            { title: "Video", detail: "MP4, WebM, MP3", icon: <VideoFileOutlinedIcon />, color: "#7a58c1", bg: "#f0eafe", action: () => openAttachmentPicker("video") },
                            { title: "Document", detail: "PDF, Word, Excel", icon: <DescriptionOutlinedIcon />, color: "#3976c5", bg: "#e8f0fd", action: () => openAttachmentPicker("document") },
                            { title: "OdraOps Gallery", detail: "Project photos", icon: <FolderOpenOutlinedIcon />, color: "#d78523", bg: "#fff2dc", action: () => { setGalleryAssets([]); loadGalleryAssets(); } }
                        ].map((option) => <Box key={option.title} component="button" type="button" disabled={uploadingAttachments} onClick={option.action}
                            sx={{ display: "flex", alignItems: "center", gap: 1.1, minWidth: 0, p: 1.15, border: "1px solid #edf0ef", borderRadius: "14px", textAlign: "left", bgcolor: "#fff", cursor: "pointer", transition: "background .16s, border-color .16s, transform .16s", "&:hover": { bgcolor: "#f8faf9", borderColor: "#dce5e1", transform: "translateY(-1px)" }, "&:disabled": { opacity: .55, cursor: "default" } }}>
                            <Box sx={{ width: 42, height: 42, flex: "0 0 42px", display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: option.bg, color: option.color }}>{React.cloneElement(option.icon, { sx: { fontSize: 21 } })}</Box>
                            <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#263632", lineHeight: 1.3 }}>{option.title}</Typography><Typography noWrap sx={{ mt: .3, fontSize: 10, color: "#84908c" }}>{option.detail}</Typography></Box>
                        </Box>)}
                    </Box>
                    {uploadingAttachments && <Typography sx={{ fontSize: 12, color: "#697586" }}>Uploading attachment…</Typography>}
                    {galleryLoading && <Typography sx={{ fontSize: 12, color: "#697586" }}>Loading project gallery…</Typography>}
                    {!galleryLoading && galleryAssets.length > 0 && <Box sx={{ mt: 2, pt: 1.6, borderTop: "1px solid #edf0ef" }}>
                        <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 700, color: "#61716b" }}>RECENT PROJECT PHOTOS</Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0.75, maxHeight: 220, overflowY: "auto" }}>
                        {galleryAssets.map((asset) => <Box key={asset.assetId} component="button" type="button" disabled={uploadingAttachments} onClick={() => uploadChatAttachment(null, asset.assetId)} sx={{ p: 0, border: "2px solid transparent", borderRadius: "10px", overflow: "hidden", bgcolor: "#f1f4f2", cursor: "pointer", aspectRatio: "1", "&:hover": { borderColor: "#168c72" }, "&:disabled": { opacity: .6 } }}>
                            <Box component="img" src={asset.thumbnailUrl || asset.imageUrl} alt={asset.originalName || "Project photo"} sx={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
                        </Box>)}
                        </Box>
                    </Box>}
                    {!galleryLoading && galleryAssets.length === 0 && <Typography sx={{ fontSize: 11, color: "#758094" }}>Choose “Photos from OdraOps Gallery” to browse project photos here.</Typography>}
                </DialogContent>
            </Dialog>
        </Box>
    );
}

