
const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskActivitySchema = new Schema(
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

        performedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        performedByRole: {
            type: String,
            enum: ["Founder", "Site Engineer"],
            required: true
        },

        action: {
            type: String,
            enum: [
                "TASK_CREATED",
                "TASK_UPDATED",
                "TASK_COMPLETED",
                "TASK_REOPENED",
                "TASK_DELETED",
                "ASSIGNEE_ADDED",
                "ASSIGNEE_REMOVED",
                "PROGRESS_UPDATED",
                "ISSUE_CREATED",
                "ISSUE_ASSIGNED",
                "ISSUE_STATUS_UPDATED",
                "ATTACHMENT_ADDED",
                "ATTACHMENT_REMOVED",
                "ISSUE_UPDATED"
            ],
            required: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        metadata: {
            type: Schema.Types.Mixed,  //can store any data type of data
            default: {}
        }
    },
    { timestamps: true }
);

taskActivitySchema.index({ taskId: 1, createdAt: -1 });

taskActivitySchema.index({
    organizationId: 1,
    projectId: 1,
    createdAt: -1
});

module.exports = mongoose.model("TaskActivity", taskActivitySchema);
