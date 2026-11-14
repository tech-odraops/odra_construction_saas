
const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskProgressSchema = new Schema(
    {
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true
        },

        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },

        // User who submitted this progress update
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        updatedByRole: {
            type: String,
            enum: ["Founder", "Site Engineer"],
            required: true
        },

        // Additional quantity completed in this update
        // Uses the unit selected in the parent Task
        completedQuantity: {
            type: Number,
            required: true,
            min: 0
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        // S3 object keys for progress photos/videos
        attachments: [
            {
                key: {
                    type: String,
                    required: true
                },

                originalName: {
                    type: String,
                    trim: true
                },

                mimeType: {
                    type: String
                },

                size: {
                    type: Number,
                    min: 0
                },

                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Retrieve progress history in chronological order
taskProgressSchema.index({
    taskId: 1,
    createdAt: -1
});

// Retrieve organization progress records
taskProgressSchema.index({
    organizationId: 1,
    projectId: 1,
    createdAt: -1
});

module.exports = mongoose.model("TaskProgress", taskProgressSchema);
