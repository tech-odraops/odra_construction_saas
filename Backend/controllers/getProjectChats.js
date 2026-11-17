const messageModel = require('../models/chatMessage');

exports.getProjectChats = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {page = 0, limit = 20} = req.query;


        const chats = await messageModel.find({ projectId,organizationId: req.user.organizationId }).sort({ createdAt: -1 }).skip(page*limit).limit(Number(limit)).populate('senderId', 'name email').lean();
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