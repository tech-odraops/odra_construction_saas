
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["invited", "active", "disabled"],
            default: "active",
            required: true
        },

        assignedProjects: [
            {
                type: Schema.Types.ObjectId,
                ref: "Project"
            }
        ],

        createdProjects: [
            {
                type: Schema.Types.ObjectId,
                ref: "Project"
            }
        ],

        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization"
        },

        fcmToken: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
