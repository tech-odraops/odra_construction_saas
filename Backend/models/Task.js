
const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskSchema = new Schema(
    {
        // Unique task identifier, e.g. TSK000001
        taskNumber: {
            type: String,
            required: true,
            trim: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        // Every task must belong to a specific project
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

        // User who created the task
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        createdByRole: {
            type: String,
            enum: ["Founder", "Site Engineer"],
            required: true
        },

        // Multiple Site Engineers can be assigned to one task
        assignees: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        // Organization-level reusable category
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "TaskCategory",
            default: null
        },

        // Unit selected to measure task progress
        progressUnitId: {
            type: Schema.Types.ObjectId,
            ref: "TaskUnit",
            default: null
        },

        // Total target quantity in the selected progress unit
        totalQuantity: {
            type: Number,
            min: 0,
            default: null
        },

        // Cumulative completed quantity, calculated by backend
        progressQuantity: {
            type: Number,
            min: 0,
            default: 0
        },

        startDate: {
            type: Date,
            default: null
        },

        endDate: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
            index: true
        },

        // S3 object keys for task attachments
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

        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Task number must be unique within an organization
taskSchema.index(
    { organizationId: 1, taskNumber: 1 },
    { unique: true }
);

// Efficient project task listing
taskSchema.index({
    organizationId: 1,
    projectId: 1,
    createdAt: -1
});

// Efficient task lookup for assigned Site Engineers
taskSchema.index({
    organizationId: 1,
    assignees: 1,
    status: 1
});

// Efficient deadline queries for overdue reminders
taskSchema.index({
    organizationId: 1,
    endDate: 1,
    status: 1
});

module.exports = mongoose.model("Task", taskSchema);
