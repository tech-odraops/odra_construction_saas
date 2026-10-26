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
const reportRoute = require('./routes/reportsRoute');
const projectRoute = require('./routes/projectRoutes');
const siteMemberRoutes = require("./routes/siteMemberRoutes");
const attendanceRoute = require('./routes/attendanceRoute');
const chatRouter = require('./routes/chatRouter');
const workerRoutes = require('./routes/workerRoutes');
const ChatMessage = require("./models/chatMessage");
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

// listening for socket connection & client 
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // listen for joining room events
    socket.on('join', async ({ contractorId, projectId, siteEngineerId, organizationId, isChat }) => {
        console.log('Join event received:', { contractorId, projectId, siteEngineerId });
        if (contractorId) {
            socket.join(`contractor-${contractorId}`);
            console.log(`Socket ${socket.id} joined contractor-${contractorId}`);
        }
        if (projectId) {
            socket.join(`project-${projectId}`);
            console.log(`Socket ${socket.id} joined project-${projectId}`);

            socket.data.chatAccess = false; // ✅ default
            console.log("Is chat = ", isChat)
            if (isChat) {
                try {
                    // ✅ Check project ONCE
                    const project = await Project.findById(projectId).select("status");

                    const canChat = project && project.status !== "Completed";

                    // ✅ Store in socket (VERY IMPORTANT)
                    socket.data.chatAccess = canChat;
                    socket.data.projectId = projectId;
                    socket.data.organizationId = organizationId;

                } catch (err) {
                    console.error("Join validation error:", err);
                    socket.data.chatAccess = false;
                }
            }

        }
        if (siteEngineerId) {
            socket.join(`siteEngineer-${siteEngineerId}`);
            console.log(`Socket ${socket.id} joined siteEngineer-${siteEngineerId}`);
        }
    })

    // if they leave the room
    socket.on('leave', ({ contractorId, projectId, siteEngineerId }) => {
        if (contractorId) socket.leave(`contractor-${contractorId}`);
        if (projectId) socket.leave(`project-${projectId}`);
        if (siteEngineerId) socket.leave(`siteEngineer-${siteEngineerId}`);
    })

    // listening for new messages
    socket.on("chat:new", async ({ projectId, senderId, message }) => {
        try {
            if (!projectId || !senderId || !message) return;
            console.log("Can Access = ", socket.data.chatAccess)

            if (!socket.data.chatAccess) {
                socket.emit("chat:error", { message: "Chat not allowed" });
                return;
            }

            const chat = await ChatMessage.create({
                projectId,
                senderId,
                message,
                organizationId: socket.data.organizationId
            });

            io.to(`project-${projectId}`).emit("chat:new", chat);

            // sendign the fcm message
            // Find project
            const project = await Project.findById(projectId)
                .select("contractor siteEngineer");

            // Determine receiver
            const receiverId =
                senderId.toString() === project.contractor.toString()
                    ? project.siteEngineer
                    : project.contractor;

            // Fetch receiver's FCM token
            const receiver = await User.findById(receiverId)
                .select("fcmToken name");

            // Send push notification
            const sender = await User.findById(senderId).select("name");
            console.log("Project:", project);
            console.log("Receiver ID:", receiverId);
            console.log("Receiver:", receiver);
            console.log("Receiver Token:", receiver?.fcmToken);
            console.log("Sender:", sender);
            await sendToUser({
                token: receiver.fcmToken,
                title: sender.name,
                body: message,
                data: {
                    type: "chat",
                    projectId,
                    senderId,
                    receiverId
                }
            });

        } catch (err) {
            console.error("Chat socket error:", err);
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
// app.use("/notification", testNotificationRoute);

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
