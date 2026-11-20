const mongoose = require("mongoose");
const path = require("path");

const Asset = require("../models/Asset");
const Organization = require("../models/Organization");
const Project = require("../models/project");
const Task = require("../models/Task");
const {
    deleteImage,
    getImageUrl,
    uploadFile,
    uploadImageWithThumbnail
} = require("../services/s3Service");

const FILE_TYPE_BY_EXTENSION = {
    ".pdf": "pdf",
    ".xlsx": "xlsx",
    ".docx": "docx",
    ".txt": "text",
    ".md": "md"
};
const FILE_MIME_BY_EXTENSION = {
    ".pdf": ["application/pdf"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".txt": ["text/plain"],
    ".md": ["text/markdown", "text/plain"]
};
const MAX_ASSET_IMAGE_SIZE = 10 * 1024 * 1024;

const parseTags = (value) => {
    if (value === undefined) return [];

    let tags = value;
    if (typeof value === "string") {
        try {
            tags = JSON.parse(value);
        } catch {
            throw Object.assign(new Error("Tags must be a JSON array of strings."), {
                statusCode: 400
            });
        }
    }

    if (!Array.isArray(tags) || tags.length > 20 ||
        tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.trim().length > 50)) {
        throw Object.assign(new Error("Tags must contain up to 20 non-empty strings of at most 50 characters."), {
            statusCode: 400
        });
    }

    return [...new Set(tags.map(tag => tag.trim()))];
};

const isValidImageContent = (file) => {
    const buffer = file?.buffer;
    if (!Buffer.isBuffer(buffer)) return false;

    if (file.mimetype === "image/jpeg") {
        return buffer.length >= 3 &&
            buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (file.mimetype === "image/png") {
        return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
        ]));
    }
    if (file.mimetype === "image/webp") {
        return buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
    }
    return false;
};

const isValidFileContent = (file, extension) => {
    const buffer = file?.buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;

    if (extension === ".pdf") {
        return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    }
    if (extension === ".xlsx" || extension === ".docx") {
        return buffer.length >= 4 &&
            buffer[0] === 0x50 && buffer[1] === 0x4b &&
            buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    const text = buffer.toString("utf8");
    return !text.includes("\u0000") && Buffer.from(text, "utf8").equals(buffer);
};

const findAccessibleProject = async (projectId, user) => {
    const project = await Project.findOne({
        _id: projectId,
        organizationId: user.organizationId
    }).select("contractor siteEngineers");

    if (!project) {
        return { error: { status: 404, message: "Project not found." } };
    }

    if (user.role === "Founder") {
        const organization = await Organization.findOne({
            _id: user.organizationId,
            ownerId: user.User_id,
            status: "active"
        }).select("_id");

        if (!organization || project.contractor.toString() !== user.User_id) {
            return { error: { status: 403, message: "You cannot access this project." } };
        }
    } else if (
        user.role !== "Site Engineer" ||
        !project.siteEngineers.some(engineerId => engineerId.toString() === user.User_id)
    ) {
        return { error: { status: 403, message: "You are not assigned to this project." } };
    }

    return { project };
};

const findAccessibleProjects = async (user) => {
    const filter = { organizationId: user.organizationId };

    if (user.role === "Founder") {
        const organization = await Organization.findOne({
            _id: user.organizationId,
            ownerId: user.User_id,
            status: "active"
        }).select("_id");

        if (!organization) {
            return { error: { status: 403, message: "You cannot access these projects." } };
        }
        filter.contractor = user.User_id;
    } else if (user.role === "Site Engineer") {
        filter.siteEngineers = user.User_id;
    } else {
        return { error: { status: 403, message: "You cannot access these projects." } };
    }

    return { projects: await Project.find(filter).select("_id title") };
};

const checkTaskAccess = async (taskId, project, user) => {
    if (!taskId) return { task: null };

    const task = await Task.findOne({
        _id: taskId,
        projectId: project._id,
        organizationId: user.organizationId
    }).select("assignees");

    if (!task) {
        return { error: { status: 404, message: "Task not found in this project." } };
    }

    if (user.role === "Site Engineer" &&
        !task.assignees.some(assigneeId => assigneeId.toString() === user.User_id)) {
        return { error: { status: 403, message: "You are not assigned to this task." } };
    }

    return { task };
};

const toAssetResponse = async (asset) => {
    const response = {
        assetId: asset._id,
        assetType: asset.assetType,
        originalName: asset.originalName,
        projectId: asset.projectId,
        taskId: asset.taskId,
        uploaderId: asset.uploaderId,
        projectFounderId: asset.projectFounderId,
        tags: asset.tags,
        sizeMB: asset.sizeMB,
        uploadedOn: asset.uploadedOn
    };

    if (asset.assetType === "file") {
        response.fileType = asset.fileType;
        response.fileUrl = await getImageUrl(asset.fileKey);
    } else {
        response.imageUrl = await getImageUrl(asset.imageKey);
        response.thumbnailUrl = asset.imageThumbnailKey
            ? await getImageUrl(asset.imageThumbnailKey)
            : null;
    }

    return response;
};

const validateAssetContext = async (req, res) => {
    const { projectId, taskId } = req.body || {};
    if (!mongoose.isValidObjectId(projectId)) {
        res.status(400).json({
            success: false,
            message: "A valid projectId is required."
        });
        return null;
    }
    if (taskId && !mongoose.isValidObjectId(taskId)) {
        res.status(400).json({
            success: false,
            message: "taskId must be a valid ID."
        });
        return null;
    }

    const access = await findAccessibleProject(projectId, req.user);
    if (access.error) {
        res.status(access.error.status).json({
            success: false,
            message: access.error.message
        });
        return null;
    }

    const taskAccess = await checkTaskAccess(taskId, access.project, req.user);
    if (taskAccess.error) {
        res.status(taskAccess.error.status).json({
            success: false,
            message: taskAccess.error.message
        });
        return null;
    }

    let tags;
    try {
        tags = parseTags(req.body.tags);
    } catch (error) {
        res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
        return null;
    }

    return {
        project: access.project,
        task: taskAccess.task,
        tags
    };
};

exports.uploadAsset = async (req, res) => {
    let uploadedKeys = [];

    try {
        const user = req.user;
        if (!req.file || !isValidImageContent(req.file)) {
            return res.status(400).json({
                success: false,
                message: "A valid JPG, PNG or WEBP image is required."
            });
        }
        const context = await validateAssetContext(req, res);
        if (!context) return;

        const upload = await uploadImageWithThumbnail({
            file: req.file,
            folder: `organizations/${user.organizationId}/projects/${context.project._id}/assets`,
            maxFileSize: MAX_ASSET_IMAGE_SIZE,
            thumbnailSize: 512,
            thumbnailQuality: 75
        });
        uploadedKeys = [upload.key, upload.thumbnailKey];

        const asset = await Asset.create({
            assetType: "image",
            imageKey: upload.key,
            imageThumbnailKey: upload.thumbnailKey,
            originalName: req.file.originalname,
            projectId: context.project._id,
            taskId: context.task?._id || null,
            uploaderId: user.User_id,
            projectFounderId: context.project.contractor,
            organizationId: user.organizationId,
            tags: context.tags,
            sizeMB: req.file.size / (1024 * 1024),
            uploadedOn: new Date()
        });

        uploadedKeys = [];
        return res.status(201).json({
            success: true,
            message: "Asset uploaded successfully.",
            asset: await toAssetResponse(asset)
        });
    } catch (error) {
        console.error("Upload asset error:", error);

        if (uploadedKeys.length) {
            const cleanup = await Promise.allSettled(uploadedKeys.map(deleteImage));
            cleanup.filter(result => result.status === "rejected")
                .forEach(result => console.error("Uploaded asset cleanup failed:", result.reason));
        }

        return res.status(500).json({
            success: false,
            message: "Could not upload asset."
        });
    }
};

exports.uploadFileAsset = async (req, res) => {
    let uploadedKey = null;

    try {
        const file = req.file;
        const extension = file?.originalname
            ? path.extname(file.originalname).toLowerCase()
            : "";
        const fileType = FILE_TYPE_BY_EXTENSION[extension];
        if (!file || !fileType ||
            !FILE_MIME_BY_EXTENSION[extension].includes(file.mimetype) ||
            !isValidFileContent(file, extension)) {
            return res.status(400).json({
                success: false,
                message: "A valid PDF, XLSX, DOCX, TXT or MD file is required."
            });
        }

        const context = await validateAssetContext(req, res);
        if (!context) return;

        const { key } = await uploadFile({
            file,
            folder: `organizations/${req.user.organizationId}/projects/${context.project._id}/assets`
        });
        uploadedKey = key;

        const asset = await Asset.create({
            assetType: "file",
            fileKey: key,
            fileType,
            originalName: file.originalname,
            projectId: context.project._id,
            taskId: context.task?._id || null,
            uploaderId: req.user.User_id,
            projectFounderId: context.project.contractor,
            organizationId: req.user.organizationId,
            tags: context.tags,
            sizeMB: file.size / (1024 * 1024),
            uploadedOn: new Date()
        });

        uploadedKey = null;
        return res.status(201).json({
            success: true,
            message: "File uploaded successfully.",
            asset: await toAssetResponse(asset)
        });
    } catch (error) {
        console.error("Upload asset file error:", error);
        if (uploadedKey) {
            try {
                await deleteImage(uploadedKey);
            } catch (cleanupError) {
                console.error("Uploaded asset file cleanup failed:", cleanupError);
            }
        }
        return res.status(500).json({
            success: false,
            message: "Could not upload file."
        });
    }
};

exports.listAssets = async (req, res) => {
    try {
        const { projectId, taskId } = req.query;
        const page = req.query.page === undefined ? 1 : Number(req.query.page);
        const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
        const { assetType, search } = req.query;

        if ((projectId && !mongoose.isValidObjectId(projectId)) ||
            (taskId && !mongoose.isValidObjectId(taskId)) ||
            !Number.isInteger(page) || page < 1 ||
            !Number.isInteger(limit) || limit < 1 || limit > 100 ||
            (assetType && !["image", "file"].includes(assetType)) ||
            (search !== undefined &&
                (typeof search !== "string" || search.length > 100))) {
            return res.status(400).json({
                success: false,
                message: "Invalid projectId, taskId, assetType, search, page, or limit."
            });
        }

        let projects;
        if (projectId) {
            const access = await findAccessibleProject(projectId, req.user);
            if (access.error) {
                return res.status(access.error.status).json({
                    success: false,
                    message: access.error.message
                });
            }
            projects = [access.project];
        } else {
            const access = await findAccessibleProjects(req.user);
            if (access.error) {
                return res.status(access.error.status).json({
                    success: false,
                    message: access.error.message
                });
            }
            projects = access.projects;
        }

        if (taskId) {
            const task = await Task.findOne({
                _id: taskId,
                organizationId: req.user.organizationId
            }).select("projectId");

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found."
                });
            }

            let project = projects.find(
                item => item._id.toString() === task.projectId.toString()
            );
            if (!project && !projectId) {
                const access = await findAccessibleProject(task.projectId, req.user);
                if (access.error) {
                    return res.status(access.error.status).json({
                        success: false,
                        message: access.error.message
                    });
                }
                project = access.project;
                projects = [project];
            }
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found in this project."
                });
            }

            const taskAccess = await checkTaskAccess(taskId, project, req.user);
            if (taskAccess.error) {
                return res.status(taskAccess.error.status).json({
                    success: false,
                    message: taskAccess.error.message
                });
            }
        }

        if (projects.length === 0) {
            return res.status(200).json({
                success: true,
                assets: [],
                total: 0,
                page,
                limit
            });
        }

        const filter = {
            organizationId: req.user.organizationId,
            projectId: { $in: projects.map(project => project._id) }
        };
        if (taskId) filter.taskId = taskId;
        if (assetType) filter.assetType = assetType;
        if (search) {
            const searchPattern = new RegExp(
                search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );
            filter.$or = [
                { originalName: searchPattern },
                { tags: searchPattern },
            ];
        }

        const [assets, total] = await Promise.all([
            Asset.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Asset.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            assets: await Promise.all(assets.map(toAssetResponse)),
            total,
            page,
            limit
        });
    } catch (error) {
        console.error("List assets error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not fetch assets."
        });
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const { assetId } = req.params;
        if (!mongoose.isValidObjectId(assetId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid asset ID."
            });
        }

        const asset = await Asset.findOne({
            _id: assetId,
            organizationId: req.user.organizationId
        });
        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found."
            });
        }

        const access = await findAccessibleProject(asset.projectId, req.user);
        if (access.error) {
            return res.status(access.error.status).json({
                success: false,
                message: access.error.message
            });
        }
        if (req.user.role === "Site Engineer" &&
            asset.uploaderId.toString() !== req.user.User_id) {
            return res.status(403).json({
                success: false,
                message: "Only the uploader or project Founder can delete this asset."
            });
        }

        try {
            await deleteImage(asset.fileKey || asset.imageKey);
            if (asset.imageThumbnailKey) await deleteImage(asset.imageThumbnailKey);
        } catch (error) {
            console.error("Delete asset from S3 error:", error);
            return res.status(502).json({
                success: false,
                message: "Could not delete the asset from storage. Please retry."
            });
        }

        await asset.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Asset deleted successfully."
        });
    } catch (error) {
        console.error("Delete asset error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not delete asset."
        });
    }
};
