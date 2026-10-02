require('dotenv').config();
const express = require('express')
const app = express();
const port = 8080;
const connectDb = require("./databaseConnect");
const cors = require('cors')
const helmet = require('helmet')
const { Server } = require('socket.io')
const { createServer } = require('http');
const http = require('http');
const reportRoute = require('./routes/reportsRoute');
const projectRoute = require('./routes/projectRoutes');
const attendanceRoute = require('./routes/attendanceRoute');
const chatRouter = require('./routes/chatRouter');
const workerRoutes = require('./routes/workerRoutes');
const ChatMessage = require("./models/chatMessage");
const Project = require("./models/project")
const inventoryRoute = require('./routes/inventoryRoutes');
const Subscription = require("./models/Subscription");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const tokenValidation = require('./routes/tokenValiditiCheaker');
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const notificationRoutes = require("./routes/notification");
const testNotificationRoute = require("./routes/testNotification");
const { sendToUser } = require("./services/notification.service");
const User = require("./models/user");
const waitlistRoute = require('./routes/waitlistRoute');

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

                    // ✅ Check subscription ONCE
                    const subscription = await Subscription.findOne({ organizationId }).select("plan status");

                    const canChat =
                        project &&
                        project.status !== "Completed" &&
                        subscription &&
                        subscription.plan === "business" &&
                        subscription.status === "active";

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
                socket.emit("subscription:error", {
                    message: "Chat not allowed"
                });
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
const { signup, signin } = require('./routes/auth/createUser')
const { googleAuth } = require('./routes/auth/googleAuth');
const { messagePost } = require("./routes/message");

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))
app.use(express.json())

// Health checkup for the server
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// requiring singup and signin
app.use('/auth', signup);
app.use('/auth', signin);

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

// using admin routes
app.use("/admin", adminRoutes);
app.use("/admin", adminDashboardRoutes);

// using subcrtiption routes
app.use("/subscription", subscriptionRoutes);

// requiring tokenValidatorChecker
app.use('/token', tokenValidation);

// using the notification routes
app.use("/notification", notificationRoutes);
// app.use("/notification", testNotificationRoute);

// using the waitlist route
app.use("/waitlist", waitlistRoute);

// for testing porpose
app.get("/ping", (req, res) => {
    res.status(200).send("OK");
});



httpServer.listen(port, () => {
    console.log("Connection to backend established")
})

// connecting to database
connectDb()