const mongoose = require("mongoose");
const { Schema } = mongoose;

const ASSET_FILE_TYPES = ["pdf", "xlsx", "docx", "text", "md"];

const assetSchema = new Schema(
    {
        assetType: {
            type: String,
            enum: ["image", "file"],
            required: true,
            default: "image"
        },
        imageKey: {
            type: String,
            default: null
        },
        imageThumbnailKey: {
            type: String,
            default: null
        },
        fileKey: {
            type: String,
            default: null
        },
        originalName: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null
        },
        fileType: {
            type: String,
            enum: ASSET_FILE_TYPES,
            required: function () {
                return this.assetType === "file";
            },
            default: null
        },
        sizeMB: {
            type: Number,
            min: 0,
            required: true
        },
        uploadedOn: {
            type: Date,
            default: Date.now,
            required: true
        },
        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            default: null,
            index: true
        },
        uploaderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        projectFounderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },
        tags: {
            type: [{
                type: String,
                trim: true,
                maxlength: 50
            }],
            default: [],
            validate: {
                validator: tags => tags.length <= 20,
                message: "An asset cannot have more than 20 tags."
            }
        }
    },
    { timestamps: true }
);

assetSchema.path("imageKey").required(function () {
    return this.assetType === "image";
});
assetSchema.path("fileKey").required(function () {
    return this.assetType === "file";
});

assetSchema.index({ organizationId: 1, projectId: 1, createdAt: -1 });
assetSchema.index({ organizationId: 1, taskId: 1, createdAt: -1 });

module.exports = mongoose.model("Asset", assetSchema);
