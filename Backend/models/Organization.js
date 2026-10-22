
const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        // Unique customer subdomain, e.g. "abc" for abc.yourdomain.com.
        // Optional for now so existing organizations remain compatible.
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            unique: true,
            sparse: true
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["onboarding", "active", "suspended"],
            default: "active",
            required: true
        },

        // Initial feature availability.
        // Project limits will be enforced separately.
        enabledModules: {
            siteProjectManagement: {
                type: Boolean,
                default: true
            },
            taskManagement: {
                type: Boolean,
                default: false
            },
            reports: {
                type: Boolean,
                default: false
            },
            materialManagement: {
                type: Boolean,
                default: true
            },
            attendance: {
                type: Boolean,
                default: false
            },
            payables: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Organization", organizationSchema);
