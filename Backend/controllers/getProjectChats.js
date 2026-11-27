const { createHash } = require("crypto");
const messageModel = require('../models/chatMessage');
const ChatConversation = require('../models/chatConversation');
const Project = require('../models/project');
const User = require('../models/user');
const Asset = require('../models/Asset');
const { uploadImage, uploadFile, getImageUrl } = require('../services/s3Service');
const path = require('path');
const { randomUUID } = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName } = require('../utils/awsS3');
const { userRoom } = require('../utils/socketRooms');

async function getProjectAccess(projectId, user) {
    const project = await Project.findOne({ _id: projectId, organizationId: user.organizationId })
        .select("contractor siteEngineers status").lean();
    if (!project) return null;
    const uid = String(user.User_id || user._id);
    const assigned = (project.siteEngineers || []).some(id => String(id) === uid);
    return project.contractor && String(project.contractor) === uid || assigned ? project : null;
}

async function withSignedAttachmentUrls(chat) {
    if (!Array.isArray(chat.attachments) || chat.attachments.length === 0) return chat;
    const attachments = await Promise.all(chat.attachments.map(async attachment => ({
        ...attachment,
        url: await getImageUrl(attachment.key)
    })));
    return { ...chat, attachments };
}

exports.uploadChatAttachment = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await getProjectAccess(projectId, req.user);
        if (!project) return res.status(403).json({ success: false, message: "Project access denied." });
        if (project.status === "Completed") return res.status(403).json({ success: false, message: "Completed projects are read only." });
        const { conversationId } = req.body;
        if (conversationId && !await ChatConversation.exists({ _id: conversationId, projectId, organizationId: req.user.organizationId, participants: req.user.User_id })) {
            return res.status(403).json({ success: false, message: "Conversation access denied." });
        }
        const file = req.file;
        let attachment;
        if (req.body.assetId && !file) {
            const asset = await Asset.findOne({
                _id: req.body.assetId, projectId, organizationId: req.user.organizationId, assetType: "image"
            }).lean();
            if (!asset) return res.status(404).json({ success: false, message: "Project image not found." });
            attachment = {
                kind: "image", originalName: asset.originalName || "Project image", mimeType: "image/jpeg",
                sizeBytes: Math.round(asset.sizeMB * 1024 * 1024), key: asset.imageKey, sourceAssetId: asset._id
            };
        } else {
            if (!file) return res.status(400).json({ success: false, message: "Choose an attachment to upload." });
            const kind = file.mimetype.startsWith("image/") ? "image" : file.mimetype.startsWith("video/") ? "video" : file.mimetype.startsWith("audio/") ? "audio" : "file";
            const folder = `chat/${req.user.organizationId}/${projectId}`;
            let uploaded;
            if (kind === "image") {
                uploaded = await uploadImage({ file, folder, maxFileSize: 50 * 1024 * 1024 });
            } else if (kind === "file") {
                uploaded = await uploadFile({ file, folder, maxFileSize: 50 * 1024 * 1024 });
            } else {
                const extension = path.extname(file.originalname).toLowerCase();
                const key = `${folder}/${randomUUID()}${extension}`;
                await s3Client.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: file.buffer, ContentType: file.mimetype }));
                uploaded = { key };
            }
            attachment = { kind, originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, key: uploaded.key };
        }

        const message = await messageModel.create({
            projectId, conversationId: conversationId || null, organizationId: req.user.organizationId,
            senderId: req.user.User_id || req.user._id, message: req.body.message || "",
            attachments: [attachment],
            readBy: [req.user.User_id || req.user._id]
        });
        const result = await messageModel.findById(message._id).populate('senderId', 'name email').lean();
        return res.status(201).json({ success: true, chat: await withSignedAttachmentUrls(result) });
    } catch (error) {
        console.error("Error uploading chat attachment:", error.name, error.message, error.$metadata || "");
        return res.status(500).json({ success: false, message: "Unable to upload chat attachment." });
    }
};

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
        const participants = [...new Set([creator, ...requested])].sort();
        const creationKey = createHash("sha256").update(JSON.stringify([
            String(projectId),
            String(req.user.organizationId),
            creator,
            name.toLowerCase(),
            participants
        ])).digest("hex");

        let conversation = await ChatConversation.findOne({
            projectId,
            organizationId: req.user.organizationId,
            createdBy: creator,
            name,
            participants: { $all: participants, $size: participants.length }
        });
        let responseStatus = 200;

        if (!conversation) {
            try {
                const upsertResult = await ChatConversation.findOneAndUpdate(
                    { creationKey },
                    {
                        $setOnInsert: {
                            projectId,
                            organizationId: req.user.organizationId,
                            name,
                            createdBy: creator,
                            participants,
                            creationKey
                        }
                    },
                    { new: true, upsert: true, runValidators: true, includeResultMetadata: true }
                );
                conversation = upsertResult.value;
                responseStatus = upsertResult.lastErrorObject?.updatedExisting ? 200 : 201;
            } catch (error) {
                if (error.code !== 11000) throw error;
                conversation = await ChatConversation.findOne({ creationKey });
                if (!conversation) throw error;
            }
        }

        const result = await ChatConversation.findById(conversation._id).populate("participants", "name role").lean();
        return res.status(responseStatus).json({ success: true, conversation: result });
    } catch (error) {
        console.error("Error creating chat group:", error);
        return res.status(500).json({ success: false, message: "Unable to create group chat." });
    }
};

exports.leaveConversation = async (req, res) => {
    try {
        const { projectId, conversationId } = req.params;
        if (!await getProjectAccess(projectId, req.user)) {
            return res.status(403).json({ success: false, message: "Project access denied." });
        }
        const result = await ChatConversation.updateOne(
            { _id: conversationId, projectId, organizationId: req.user.organizationId, participants: req.user.User_id },
            { $pull: { participants: req.user.User_id } }
        );
        if (!result.modifiedCount) {
            return res.status(404).json({ success: false, message: "Group not found or you have already left." });
        }
        return res.json({ success: true, message: "You left the group." });
    } catch (error) {
        console.error("Error leaving chat group:", error);
        return res.status(500).json({ success: false, message: "Unable to leave this group." });
    }
};
exports.getProjectChats = async (req, res) => {
    try {
        const { projectId } = req.params;
        const requestedPage = Number.parseInt(req.query.page, 10);
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const page = Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
        const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 10) : 10;

        const conversationId = req.query.conversationId || null;
        if (!await getProjectAccess(projectId, req.user)) return res.status(403).json({ success: false, message: "Project access denied." });
        if (conversationId && !await ChatConversation.exists({ _id: conversationId, projectId, organizationId: req.user.organizationId, participants: req.user.User_id })) return res.status(403).json({ success: false, message: "Conversation access denied." });
        const rawChats = await messageModel.find({ projectId, organizationId: req.user.organizationId, conversationId }).sort({ createdAt: -1, _id: -1 }).skip(page * limit).limit(limit).populate('senderId', 'name email').lean();
        const chats = await Promise.all(rawChats.reverse().map(withSignedAttachmentUrls));
        return res.status(200).json({ success: true, chats, message: "Chats fetched successfully" });
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
        const { conversationId } = req.body || {};
        if (!await getProjectAccess(projectId, req.user)) {
            return res.status(403).json({ success: false, message: "Project access denied." });
        }
        if (conversationId && !await ChatConversation.exists({
            _id: conversationId, projectId, organizationId: req.user.organizationId, participants: userId
        })) {
            return res.status(403).json({ success: false, message: "Conversation access denied." });
        }
        const filter = {
            projectId,
            organizationId: req.user.organizationId,
            conversationId: conversationId || null,
            senderId: { $ne: userId },
            readBy: { $ne: userId }
        };
        const unreadMessages = await messageModel.find(filter).select("_id senderId").lean();
        if (unreadMessages.length) {
            await messageModel.updateMany(filter, { $addToSet: { readBy: userId } });
            const io = req.app.get("io");
            const messageIdsBySender = new Map();
            unreadMessages.forEach(message => {
                const senderId = String(message.senderId);
                if (!messageIdsBySender.has(senderId)) messageIdsBySender.set(senderId, []);
                messageIdsBySender.get(senderId).push(String(message._id));
            });
            messageIdsBySender.forEach((messageIds, senderId) => io?.to(userRoom(senderId)).emit("chat:read", {
                projectId: String(projectId), conversationId: conversationId || null, messageIds, readerId: String(userId)
            }));
        }
        return res.status(200).json({ success: true, messageIds: unreadMessages.map(message => String(message._id)), message: "Messages marked as read" });
    }
    catch (error) {
        console.error("Error marking chat as read:", error);
        return res.status(500).json({ success: false, message: "Error marking chat as read" });
    }
}
