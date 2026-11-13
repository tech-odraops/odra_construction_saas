
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/user");
const Organization = require("../models/Organization");

const socketAuth = async (socket, next) => {
    try {
        // Get JWT from Socket.IO handshake
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required."));
        }

        if (!process.env.secret_key) {
            console.error("JWT secret is not configured.");
            return next(new Error("Authentication unavailable."));
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.secret_key,
            {
                algorithms: ["HS256"]
            }
        );

        // Validate token payload
        if (
            !decoded.User_id ||
            !decoded.organizationId ||
            decoded.isLoggedIn !== true ||
            !["Founder", "Site Engineer"].includes(decoded.role) ||
            !mongoose.isValidObjectId(decoded.User_id) ||
            !mongoose.isValidObjectId(decoded.organizationId)
        ) {
            return next(new Error("Invalid authentication credentials."));
        }

        // Verify active user
        const user = await User.findOne({
            _id: decoded.User_id,
            organizationId: decoded.organizationId,
            status: "active"
        }).select("_id role organizationId status");

        if (!user || user.role !== decoded.role) {
            return next(new Error("User account is inactive or invalid."));
        }

        // Verify active organization
        const organization = await Organization.findOne({
            _id: decoded.organizationId,
            status: "active"
        }).select("_id status");

        if (!organization) {
            return next(new Error("Organization is inactive."));
        }

        // Store trusted identity on the socket
        socket.data.user = {
            userId: user._id.toString(),
            role: user.role,
            organizationId: organization._id.toString()
        };

        return next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return next(new Error("Invalid or expired token."));
        }

        console.error("Socket authentication error:", error.message);

        return next(new Error("Socket authentication failed."));
    }
};

module.exports = socketAuth;
