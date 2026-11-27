import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "../utils/axiosInstance"
import { jwtDecode } from "jwt-decode";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "./atoms/Button/Button";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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

    // 🔐 get current user id from JWT
    const token = localStorage.getItem("token");
    const currentUserId = token ? String(jwtDecode(token).User_id || "") : "";

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
                `/chat/${projectId}?page=${pageNumber}&limit=20${activeConversation ? `&conversationId=${activeConversation}` : ""}`
            );

            const newChats = Array.isArray(res.data.chats) ? res.data.chats : [];

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
        };

        const handleProjectDeleted = () => {
            toast.info("Project has been deleted");
            navigate(`/site-engineer/projects`);
        };
        socket.on("chat:new", handleNewMessage);
        const handleChatError = (error) => toast.error(error?.message || "Message could not be sent.");
        socket.on("chat:error", handleChatError);
        socket.on("project:deleted", handleProjectDeleted);


        return () => {
            socket.off("chat:new", handleNewMessage);
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
                        const preview = recent?.message || (conversation.isDefault ? "Start a conversation" : "Group conversation");
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
                        const sentAt = msg.createdAt ? new Date(msg.createdAt) : null;
                        const isMine = String(senderId || "") === currentUserId;
                        const participant = participants.find((member) => String((typeof member === "string" ? member : member?._id) || "") === String(senderId || ""));
                        const senderName = msg.senderId?.name || msg.senderName || participant?.name;
                        const time = sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
                        return <Box key={msg._id} sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                            <Box sx={{ maxWidth: "76%", px: 1.5, py: 1, borderRadius: isMine ? "14px 14px 5px 14px" : "14px 14px 14px 5px", bgcolor: isMine ? "#fff1eb" : "#f0f1f2", color: "#46505c", boxShadow: "0 1px 2px rgba(20,30,45,0.12)", overflowWrap: "anywhere" }}>
                                {!isMine && senderId && <Typography sx={{ fontSize: 10, fontWeight: 700, mb: 0.25 }}>{senderName || "Project member"}</Typography>}
                                <Typography sx={{ fontSize: 11, lineHeight: 1.45 }}>{msg.message}</Typography>
                                {time && <Typography component="time" dateTime={sentAt.toISOString()} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.3, mt: 0.25, fontSize: 8, lineHeight: 1, color: "#7d8794" }}>{time}{isMine && <CheckDoubleIcon sx={{ fontSize: 11, color: "#47b93e" }} />}</Typography>}
                            </Box>
                        </Box>;
                    })}
                    <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ flexShrink: 0, mx: 1.2, mb: 1.2, minHeight: 38, display: "flex", alignItems: "center", gap: 0.7, border: "1px solid #d9d9dc", borderRadius: "11px", bgcolor: "#fafafa", px: 0.7 }}>
                    <IconButton aria-label="Add attachment" size="small" sx={{ color: "#7e8389" }}><AddIcon /></IconButton>
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
        </Box>
    );
}

