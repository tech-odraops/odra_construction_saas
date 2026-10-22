const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user");
const Organization = require("../models/Organization");

exports.authen = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Valid Bearer token required"
            });
        }

        const token = authorization.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Token not found"
            });
        }

        if (!process.env.secret_key) {
            console.error("JWT secret is not configured.");

            return res.status(500).json({
                success: false,
                error: "Internal Server Error"
            });
        }

        const decoded = jwt.verify(token, process.env.secret_key, {
            algorithms: ["HS256"]
        });

        if (!decoded.User_id || !decoded.role || decoded.isLoggedIn !== true) {
            return res.status(401).json({
                success: false,
                error: "Invalid token payload"
            });
        }

        // Keep platform-admin authentication separate from customer accounts.
        if (decoded.role === "admin") {
            req.user = decoded;
            return next();
        }

        if (
            !decoded.organizationId ||
            !mongoose.isValidObjectId(decoded.User_id) ||
            !mongoose.isValidObjectId(decoded.organizationId)
        ) {
            return res.status(403).json({
                success: false,
                error: "Invalid organization access"
            });
        }

        // Verify that the account is still active and belongs to this organization.
        const user = await User.findOne({
            _id: decoded.User_id,
            organizationId: decoded.organizationId,
            status: "active"
        }).select("_id role organizationId status");

        if (!user || user.role !== decoded.role) {
            return res.status(401).json({
                success: false,
                error: "Account is inactive or token is no longer valid"
            });
        }

        const organization = await Organization.findOne({
            _id: decoded.organizationId,
            status: "active"
        }).select("_id status");

        if (!organization) {
            return res.status(403).json({
                success: false,
                error: "Organization is not active"
            });
        }

        // Preserve the claims existing controllers expect.
        req.user = {
            ...decoded,
            User_id: user._id.toString(),
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
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token"
            });
        }

        console.error("Authentication middleware error:", error.message);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
};
