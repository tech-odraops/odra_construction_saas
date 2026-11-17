require('dotenv').config();
const express = require('express')
const app = express();
const port = 8080;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
const connectDb = require("./databaseConnect");
const cors = require('cors')
const helmet = require('helmet')
const { Server } = require('socket.io')
const { createServer } = require('http');
const http = require('http');
const jwt = require("jsonwebtoken");
const reportRoute = require('./routes/reportsRoute');
const projectRoute = require('./routes/projectRoutes');
const siteMemberRoutes = require("./routes/siteMemberRoutes");
const attendanceRoute = require('./routes/attendanceRoute');
const chatRouter = require('./routes/chatRouter');
const workerRoutes = require('./routes/workerRoutes');
const ChatMessage = require("./models/chatMessage");
const ChatConversation = require("./models/chatConversation");
const Project = require("./models/project")
const inventoryRoute = require('./routes/inventoryRoutes');
const adminRoutes = require("./routes/adminRoutes");
const tokenValidation = require('./routes/tokenValiditiCheaker');
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const notificationRoutes = require("./routes/notification");
const testNotificationRoute = require("./routes/testNotification");
const { sendToUser } = require("./services/notification.service");
const { password } = require("./routes/auth/password");
const User = require("./models/user");
const profileRoutes = require("./routes/profileRoutes");
const taskCategoryRoutes = require("./routes/taskCategoryRoutes");
const taskUnitRoutes = require("./routes/taskUnitRoutes");
const taskRoutes = require("./routes/taskRoutes");
const mongoose = require("mongoose");
const Task = require("./models/Task");
const Organization = require("./models/Organization");
const socketAuth = require("./middleware/socketAuth");
const {
    userRoom,
    projectRoom,
    taskRoom
} = require("./utils/socketRooms");

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
        "http://localhost:5173",
        "https://odraopssaass.netlify.app",
        "https://odraops.com",
        "https://www.odraops.com"
    ];

// creating http server and mounting socket.io to it
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});
app.set('io', io); // attaching io to app for easy access in routes

// Authenticate every Socket.IO connection
io.use(socketAuth);

// listening for socket coonection & client
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    try {
        const token = socket.handshake.auth?.token;
        const decoded = token && jwt.verify(token, process.env.secret_key, { algorithms: ["HS256"] });
        if (decoded?.isLoggedIn === true && decoded.User_id) socket.data.authUser = decoded;
    } catch (_) {
        socket.data.authUser = null;
    }

    // listen for joining room events
    socket.on('join', async ({ contractorId, projectId, siteEngineerId, organizationId, isChat, conversationId }) => {
        console.log('Join event received:', { contractorId, projectId, siteEngineerId });
        if (contractorId) {
            socket.join(`contractor-${contractorId}`);
            console.log(`Socket ${socket.id} joined contractor-${contractorId}`);
        }
        if (projectId) {
            // Project feature sockets also use this room for live reports,
            // attendance, inventory, and project updates.
            if (!isChat) socket.join(`project-${projectId}`);
            socket.data.chatAccess = false; // ✅ default
            console.log("Is chat = ", isChat)
            if (isChat) {
                try {
                    // ✅ Check project ONCE
                    const project = await Project.findOne({ _id: projectId, organizationId }).select("status contractor siteEngineers");
                    const authUser = socket.data.authUser;
                    const userId = authUser?.User_id;
                    const activeUser = authUser && await User.findOne({ _id: userId, organizationId, status: "active", role: authUser.role }).select("_id");
                    const assigned = project?.siteEngineers?.some(id => String(id) === String(userId));
                    const isFounder = project?.contractor && String(project.contractor) === String(userId);
                    let canChat = Boolean(activeUser && authUser && String(authUser.organizationId) === String(organizationId) && project && project.status !== "Completed" && (assigned || isFounder));
                    if (conversationId) {
                        canChat = canChat && Boolean(await ChatConversation.exists({ _id: conversationId, projectId, organizationId, participants: userId }));
                    }

                    // ✅ Store in socket (VERY IMPORTANT)
                    socket.data.chatAccess = canChat;
                    socket.data.projectId = projectId;
                    socket.data.organizationId = organizationId;
                    socket.data.userId = userId;
                    socket.data.conversationId = conversationId || null;
                    if (canChat && conversationId) socket.join(`conversation-${conversationId}`);
                    if (canChat && !conversationId) socket.join(`project-${projectId}`);

                } catch (err) {
                    console.error("Join validation error:", err);
                    socket.data.chatAccess = false;
                }
    try {
        const joined = socket.join(userRoom(socket.data.user.userId));
        if (joined && typeof joined.catch === "function") {
            joined.catch(error => {
                console.error("Personal room join failed:", error);
                socket.disconnect(true);
            });
        }
    } catch (error) {
        console.error("Personal room join failed:", error);
        socket.disconnect(true);
        return;
    }

    // Join an authorized project room
    socket.on("join", async ({ projectId, isChat } = {}) => {
        try {
            const { userId, role, organizationId } = socket.data.user;

            if (!mongoose.isValidObjectId(projectId)) {
                socket.emit("room:error", {
                    message: "Invalid project ID."
                });
                return;
            }

            // Find project only within the authenticated user's organization
            const project = await Project.findOne({
                _id: projectId,
                organizationId
            }).select("contractor siteEngineers status");

            if (!project) {
                socket.emit("room:error", {
                    message: "Project not found or access denied."
                });
                return;
            }

            // Verify project membership
            let hasAccess = false;

            if (role === "Founder") {
                hasAccess =
                    project.contractor.toString() === userId;
            }

            if (role === "Site Engineer") {
                hasAccess = project.siteEngineers.some(
                    (engineerId) => engineerId.toString() === userId
                );
            }

            if (!hasAccess) {
                socket.emit("room:error", {
                    message: "You are not authorized to join this project."
                });
                return;
            }

            // Join the server-generated room name
            const roomName = projectRoom(project._id);
            await socket.join(roomName);

            // Track chat access separately for each project
            if (!socket.data.chatProjects) {
                socket.data.chatProjects = new Set();
            }

            if (isChat === true && project.status !== "Completed") {
                socket.data.chatProjects.add(project._id.toString());
            } else {
                socket.data.chatProjects.delete(project._id.toString());
            }

            console.log(`Socket ${socket.id} joined ${roomName}`);

        } catch (error) {
            console.error("Project room join error:", error);

            socket.emit("room:error", {
                message: "Unable to join project room."
            });
        }
    });

    // Leave an authorized project room
    socket.on("leave", async ({ projectId } = {}) => {
        try {
            if (!mongoose.isValidObjectId(projectId)) {
                return;
            }

            const roomName = projectRoom(projectId);

            await socket.leave(roomName);

            socket.data.chatProjects?.delete(projectId.toString());

            console.log(`Socket ${socket.id} left ${roomName}`);

        } catch (error) {
            console.error("Project room leave error:", error);
        }
    });

    // Join an authorized task room
    socket.on("task:join", async ({ taskId } = {}) => {
        try {
            const { userId, role, organizationId } = socket.data.user;

            if (!mongoose.isValidObjectId(taskId)) {
                socket.emit("room:error", {
                    message: "Invalid task ID."
                });
                return;
            }

            const task = await Task.findOne({
                _id: taskId,
                organizationId
            }).select("projectId assignees");

            if (!task) {
                socket.emit("room:error", {
                    message: "Task not found or access denied."
                });
                return;
            }

            const project = await Project.findOne({
                _id: task.projectId,
                organizationId
            }).select("contractor siteEngineers");

    // listening for new messages
    socket.on("chat:new", async ({ projectId, senderId, message, conversationId }) => {
            if (!project) {
                socket.emit("room:error", {
                    message: "Parent project not found."
                });
                return;
            }

            let hasAccess = false;

            if (role === "Founder") {
                const organization = await Organization.findOne({
                    _id: organizationId,
                    status: "active"
                }).select("ownerId");

                hasAccess =
                    organization &&
                    organization.ownerId.toString() === userId &&
                    project.contractor.toString() === userId;
            }

            if (role === "Site Engineer") {
                hasAccess = task.assignees.some(
                    (assigneeId) => assigneeId.toString() === userId
                );
            }

            if (!hasAccess) {
                socket.emit("room:error", {
                    message: "You are not authorized to join this task."
                });
                return;
            }

            const roomName = taskRoom(task._id);

            await socket.join(roomName);

            console.log(`Socket ${socket.id} joined ${roomName}`);

        } catch (error) {
            console.error("Task room join error:", error);

            socket.emit("room:error", {
                message: "Unable to join task room."
            });
        }
    });

    // Leave a task room
    socket.on("task:leave", async ({ taskId } = {}) => {
        try {
            if (!mongoose.isValidObjectId(taskId)) {
                return;
            }

            await socket.leave(taskRoom(taskId));

            console.log(`Socket ${socket.id} left task-${taskId}`);

        } catch (error) {
            console.error("Task room leave error:", error);
        }
    });

    socket.on("chat:new", async ({ projectId, message } = {}) => {
        try {
            const { userId, role, organizationId } = socket.data.user;

            // Validate incoming data
            if (
                !mongoose.isValidObjectId(projectId) ||
                typeof message !== "string" ||
                !message.trim() ||
                message.trim().length > 5000
            ) {
                socket.emit("chat:error", {
                    message: "Invalid chat message."
                });
                return;
            }

            // Confirm that this socket has joined this project's chat
            if (!socket.data.chatProjects?.has(projectId.toString())) {
                socket.emit("chat:error", {
                    message: "You are not authorized to send messages in this project."
                });
                return;
            }

            // Recheck project membership and status
            const project = await Project.findOne({
                _id: projectId,
                organizationId
            }).select("contractor siteEngineers status");

            if (!project || project.status === "Completed") {
                socket.emit("chat:error", {
                    message: "Chat is not available for this project."
                });
                return;
            }

            const isFounder =
                role === "Founder" &&
                project.contractor.toString() === userId;

            if (!socket.data.chatAccess || String(senderId) !== String(socket.data.userId) || String(projectId) !== String(socket.data.projectId) || String(conversationId || "") !== String(socket.data.conversationId || "")) {
                socket.emit("chat:error", { message: "Chat not allowed" });
                return;
            }

            const savedChat = await ChatMessage.create({
                projectId,
                senderId,
                message,
                organizationId: socket.data.organizationId,
                conversationId: conversationId || null
            const isSiteEngineer =
                role === "Site Engineer" &&
                project.siteEngineers.some(
                    (engineerId) => engineerId.toString() === userId
                );

            if (!isFounder && !isSiteEngineer) {
                socket.emit("chat:error", {
                    message: "You are not authorized to send messages."
                });
                return;
            }

            // Save message using authenticated identity
            const chat = await ChatMessage.create({
                projectId,
                senderId: userId,
                message: message.trim(),
                organizationId
            });
            const chat = await ChatMessage.findById(savedChat._id).populate("senderId", "name email").lean();

            const chatRoom = conversationId ? `conversation-${conversationId}` : `project-${projectId}`;
            io.to(chatRoom).emit("chat:new", chat);

            // sendign the fcm message
            // Find project
            const project = await Project.findById(projectId)
                .select("contractor siteEngineer siteEngineers");

            // Determine receiver
            const recipientIds = conversationId
                ? (await ChatConversation.findById(conversationId).select("participants")).participants.filter(id => String(id) !== String(senderId))
                : (String(senderId) === String(project.contractor)
                    ? (project.siteEngineers || [project.siteEngineer]).filter(Boolean)
                    : [project.contractor]);

            // Fetch receiver's FCM token
            const sender = await User.findById(senderId).select("name");
            for (const receiverId of recipientIds) {
                const receiver = await User.findById(receiverId).select("fcmToken");
                if (receiver?.fcmToken) await sendToUser({ token: receiver.fcmToken, title: sender?.name || "Project chat", body: message, data: { type: "chat", projectId, senderId, receiverId: String(receiverId), conversationId: conversationId || "" } });
            }
            // Broadcast to authorized project-room members
            io.to(projectRoom(projectId)).emit("chat:new", chat);

            // Determine notification recipients
            let recipientIds = [];

            if (isFounder) {
                recipientIds = project.siteEngineers.map(
                    (engineerId) => engineerId.toString()
                );
            } else {
                recipientIds = [project.contractor.toString()];
            }

            // Exclude sender and remove duplicate recipients
            recipientIds = [
                ...new Set(recipientIds.filter(id => id !== userId))
            ];

            const sender = await User.findById(userId).select("name");

            // Send push notifications to recipients
            const recipients = await User.find({
                _id: { $in: recipientIds },
                organizationId,
                status: "active"
            }).select("_id fcmToken");

            await Promise.allSettled(
                recipients
                    .filter(recipient => recipient.fcmToken)
                    .map(recipient =>
                        sendToUser({
                            token: recipient.fcmToken,
                            title: sender?.name || "New message",
                            body: message.trim(),
                            data: {
                                type: "chat",
                                projectId: projectId.toString(),
                                senderId: userId,
                                receiverId: recipient._id.toString()
                            }
                        })
                    )
            );

        } catch (error) {
            console.error("Chat socket error:", error);

            socket.emit("chat:error", {
                message: "Unable to send chat message."
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    })
})

// requiring routes
const { signin } = require('./routes/auth/createUser')
const { googleAuth } = require('./routes/auth/googleAuth');
const { messagePost } = require("./routes/message");

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))
app.use(express.json())

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health checkup for the server
/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     security: []
 *     responses:
 *       "200":
 *         description: Server is healthy.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 */
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// requiring singup and signin
// app.use('/auth', signup);
app.use('/auth', signin);

// founder activation link 
const { activation } = require("./routes/auth/activation");
app.use("/auth", activation);
app.use("/auth", password);

// requiring google auth
app.use('/auth', googleAuth);

// requiring message
app.use('/', messagePost);

// using the project and report routes
app.use('/projects', projectRoute);
app.use('/reports', reportRoute);
app.use('/attendance', attendanceRoute);
app.use('/chat', chatRouter);
app.use('/workers', workerRoutes);
app.use('/inventory', inventoryRoute);

// Site Member management 
app.use("/site-members", siteMemberRoutes);

// using admin routes
app.use("/admin", adminRoutes);
app.use("/admin", adminDashboardRoutes);

// requiring tokenValidatorChecker
app.use('/token', tokenValidation);

// using the notification routes
app.use("/notification", notificationRoutes);

// Profile management
app.use("/profile", profileRoutes);

// Task Category Management
app.use("/task-categories", taskCategoryRoutes);

// Task Unit Management
app.use("/task-units", taskUnitRoutes);

// Task Management
app.use("/tasks", taskRoutes);

// for testing porpose
/**
 * @openapi
 * /ping:
 *   get:
 *     tags:
 *       - Health
 *     summary: Ping
 *     security: []
 *     responses:
 *       "200":
 *         description: Server responded.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 */
app.get("/ping", (req, res) => {
    res.status(200).send("OK");
});

httpServer.listen(port, () => {
    console.log("Connection to backend established")
})

// connecting to database
connectDb()
