
const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskCategorySchema = new Schema(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        icon: {
            type: String,
            trim: true,
            default: null
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Prevent duplicate category names within the same organization.
taskCategorySchema.index(
    { organizationId: 1, name: 1 },
    { unique: true }
);

module.exports = mongoose.model("TaskCategory", taskCategorySchema);
