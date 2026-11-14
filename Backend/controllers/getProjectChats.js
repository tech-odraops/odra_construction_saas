const messageModel = require('../models/chatMessage');
const ChatConversation = require('../models/chatConversation');
const Project = require('../models/project');
const User = require('../models/user');

async function getProjectAccess(projectId, user) {
    const project = await Project.findOne({ _id: projectId, organizationId: user.organizationId })
        .select("contractor siteEngineers status").lean();
    if (!project) return null;
    const uid = String(user.User_id || user._id);
    const assigned = (project.siteEngineers || []).some(id => String(id) === uid);
    return project.contractor && String(project.contractor) === uid || assigned ? project : null;
}

exports.getConversations = async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!await getProjectAccess(projectId, req.user)) return res.status(403).json({ success: false, message: "Project access denied." });
        const uid = req.user.User_id;
        const conversations = await ChatConversation.find({ projectId, organizationId: req.user.organizationId, participants: uid })
            .populate("participants", "name role").sort({ createdAt: -1 }).lean();
        const project = await Project.findById(projectId).select("siteEngineers").lean();
        const members = await User.find({ _id: { $in: project?.siteEngineers || [] }, organizationId: req.user.organizationId, status: "active", role: "Site Engineer" }).select("_id name role").sort({ name: 1 }).lean();
        return res.json({ success: true, members, conversations: [{ _id: null, name: "Project chat", isDefault: true }, ...conversations] });
    } catch (error) {
        console.error("Error getting chat conversations:", error);
        return res.status(500).json({ success: false, message: "Unable to load conversations." });
    }
};

exports.createConversation = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await getProjectAccess(projectId, req.user);
        if (!project) return res.status(403).json({ success: false, message: "Project access denied." });
        if (project.status === "Completed") return res.status(403).json({ success: false, message: "Completed projects are read only." });
        const name = String(req.body.name || "").trim();
        if (!name || name.length > 80) return res.status(400).json({ success: false, message: "Group name is required (up to 80 characters)." });
        const requested = [...new Set((Array.isArray(req.body.participantIds) ? req.body.participantIds : []).map(String))];
        const engineers = await User.find({ _id: { $in: project.siteEngineers || [] }, organizationId: req.user.organizationId, status: "active", role: "Site Engineer" }).distinct("_id");
        const engineerIds = engineers.map(String);
        if (requested.length < 1 || requested.some(id => id === String(req.user.User_id) || !engineerIds.includes(id))) {
            return res.status(400).json({ success: false, message: "Choose at least one engineer assigned to this project." });
        }
        const creator = String(req.user.User_id);
        const participants = [...new Set([creator, ...requested])];
        const conversation = await ChatConversation.create({ projectId, organizationId: req.user.organizationId, name, createdBy: creator, participants });
        const result = await ChatConversation.findById(conversation._id).populate("participants", "name role").lean();
        return res.status(201).json({ success: true, conversation: result });
    } catch (error) {
        console.error("Error creating chat group:", error);
        return res.status(500).json({ success: false, message: "Unable to create group chat." });
    }
};

exports.getProjectChats = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {page = 0, limit = 20} = req.query;


        const conversationId = req.query.conversationId || null;
        if (!await getProjectAccess(projectId, req.user)) return res.status(403).json({ success: false, message: "Project access denied." });
        if (conversationId && !await ChatConversation.exists({ _id: conversationId, projectId, organizationId: req.user.organizationId, participants: req.user.User_id })) return res.status(403).json({ success: false, message: "Conversation access denied." });
        const chats = await messageModel.find({ projectId, organizationId: req.user.organizationId, conversationId }).sort({ createdAt: -1 }).skip(page*limit).limit(Number(limit)).populate('senderId', 'name email').lean();
        return res.status(200).json({ success: true, chats:chats.reverse(), message: "Chats fetched successfully" });
    }
    catch (error) {
        console.error("Error getting project chats:", error);
        return res.status(500).json({ success: false, message: "Error getting project chats" });
    }
}

exports.getUnreadCount = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.User_id || req.user._id;
        const count = await messageModel.countDocuments({
            projectId: projectId,
            organizationId: req.user.organizationId,
            senderId: { $ne: userId },
            readBy: { $ne: userId }
        });

        return res.status(200).json({ success: true, count, message: "Unread count fetched successfully" });
    }
    catch (error) {
        console.error("Error getting unread count:", error);
        return res.status(500).json({ success: false, message: "Error getting unread count" });
    }
}

exports.markChatRead = async (req, res) => {
    try { 
        const { projectId } = req.params;
        const userId = req.user.User_id || req.user._id;

        const result = await messageModel.updateMany(
            {
                projectId: projectId,
                organizationId: req.user.organizationId,
                senderId: { $ne: userId },
                readBy: { $ne: userId }
            },
            {
                $push: { readBy: userId }
            }
        );

        return res.status(200).json({ success: true, message: "Messages marked as read" });
    }
    catch (error) {
        console.error("Error marking chat as read:", error);
        return res.status(500).json({ success: false, message: "Error marking chat as read" });
    }
}
