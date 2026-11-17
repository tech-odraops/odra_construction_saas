
const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskIssueSchema = new Schema(
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

        // User who raised the issue
        raisedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        raisedByRole: {
            type: String,
            enum: ["Founder", "Site Engineer"],
            required: true
        },

        // Site Engineer responsible for resolving the issue
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        dueDate: {
            type: Date,
            default: null
        },

        tags: [{
            type: String,
            trim: true
        }],

        status: {
            type: String,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open",
            index: true
        },

        // S3 object keys for issue attachments
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

                uploadedBy: {
                    type: Schema.Types.ObjectId,
                    ref: "User"
                },

                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        resolvedAt: {
            type: Date,
            default: null
        },

        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Retrieve issues belonging to a task
taskIssueSchema.index({
    taskId: 1,
    status: 1,
    createdAt: -1
});

// Retrieve project issues
taskIssueSchema.index({
    organizationId: 1,
    projectId: 1,
    status: 1
});

// Retrieve issues assigned to a Site Engineer
taskIssueSchema.index({
    assignedTo: 1,
    status: 1
});

module.exports = mongoose.model("TaskIssue", taskIssueSchema);
