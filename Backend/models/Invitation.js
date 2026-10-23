
const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        role: {
            type: String,
            required: true
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            select: false
        },

        expiresAt: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: ["invited", "accepted", "revoked"],
            default: "invited",
            required: true
        },

        acceptedAt: {
            type: Date,
            default: null
        },

        revokedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Invitation", invitationSchema);
