
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Project = require("../models/project");
const User = require("../models/user");
const Organization = require("../models/Organization");
const TaskCategory = require("../models/TaskCategory");
const TaskUnit = require("../models/TaskUnit");
const TaskActivity = require("../models/TaskActivity");
const TaskProgress = require("../models/TaskProgress");

const {
    uploadImage,
    deleteImage,
    getImageUrl
} = require("../services/s3Service");
const {
    emitToRooms,
    taskParticipantIds,
    taskRoom,
    removeUserFromTaskRoom,
    clearRoom
} = require("../utils/socketRooms");

// Create a new task
exports.createTask = async (req, res) => {
    let session;

    try {
        const {
            title,
            description,
            projectId,
            categoryId,
            progressUnitId,
            totalQuantity,
            startDate,
            endDate,
            assignees = []
        } = req.body;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to create tasks."
            });
        }

        session = await mongoose.startSession();

        let createdTask;
        let founderId;

        await session.withTransaction(async () => {

            // 1. Verify organization
            const organization = await Organization.findOne({
                _id: organizationId,
                status: "active"
            }).session(session);

            if (!organization) {
                throw Object.assign(
                    new Error("Organization not found or inactive."),
                    { statusCode: 403 }
                );
            }

            // 2. Verify active creator
            const creator = await User.findOne({
                _id: creatorId,
                organizationId,
                role: creatorRole,
                status: "active"
            }).select("_id role").session(session);

            if (!creator) {
                throw Object.assign(
                    new Error("Active organization membership could not be verified."),
                    { statusCode: 403 }
                );
            }

            // 3. Verify project belongs to this organization
            const project = await Project.findOne({
                _id: projectId,
                organizationId
            }).session(session);

            if (!project) {
                throw Object.assign(
                    new Error("Project not found in your organization."),
                    { statusCode: 404 }
                );
            }

            founderId = project.contractor;

            // 4. Verify Founder ownership or Site Engineer assignment
            if (creatorRole === "Founder") {
                if (
                    organization.ownerId.toString() !== creatorId.toString() ||
                    project.contractor.toString() !== creatorId.toString()
                ) {
                    throw Object.assign(
                        new Error("You cannot create tasks for this project."),
                        { statusCode: 403 }
                    );
                }
            }

            if (creatorRole === "Site Engineer") {
                const isAssignedToProject = project.siteEngineers.some(
                    engineerId =>
                        engineerId.toString() === creatorId.toString()
                );

                if (!isAssignedToProject) {
                    throw Object.assign(
                        new Error("You are not assigned to this project."),
                        { statusCode: 403 }
                    );
                }

                // Site Engineers cannot assign other users during task creation.
                // They are automatically assigned to the task themselves.
                if (assignees.length > 0) {
                    throw Object.assign(
                        new Error(
                            "Site Engineers cannot select additional assignees during task creation."
                        ),
                        { statusCode: 403 }
                    );
                }
            }

            // 5. Verify category belongs to this organization and is active
            const category = await TaskCategory.findOne({
                _id: categoryId,
                organizationId,
                isActive: true
            }).session(session);

            if (!category) {
                throw Object.assign(
                    new Error("Invalid or inactive task category."),
                    { statusCode: 400 }
                );
            }

            // 6. Verify progress unit belongs to this organization and is active
            const unit = await TaskUnit.findOne({
                _id: progressUnitId,
                organizationId,
                isActive: true
            }).session(session);

            if (!unit) {
                throw Object.assign(
                    new Error("Invalid or inactive progress unit."),
                    { statusCode: 400 }
                );
            }

            // 7. Verify selected assignees for Founder-created tasks
            let finalAssignees = [];

            if (creatorRole === "Founder") {
                const uniqueAssigneeIds = [
                    ...new Set(assignees.map(id => id.toString()))
                ];

                if (uniqueAssigneeIds.length !== assignees.length) {
                    throw Object.assign(
                        new Error("Duplicate assignees are not allowed."),
                        { statusCode: 400 }
                    );
                }

                if (uniqueAssigneeIds.length > 0) {
                    const eligibleEngineers = await User.find({
                        _id: { $in: uniqueAssigneeIds },
                        organizationId,
                        role: "Site Engineer",
                        status: "active"
                    }).select("_id").session(session);

                    const eligibleIds = new Set(
                        eligibleEngineers.map(user => user._id.toString())
                    );

                    const projectEngineerIds = new Set(
                        project.siteEngineers.map(id => id.toString())
                    );

                    const allEligible = uniqueAssigneeIds.every(id =>
                        eligibleIds.has(id) && projectEngineerIds.has(id)
                    );

                    if (!allEligible) {
                        throw Object.assign(
                            new Error(
                                "Every assignee must be an active Site Engineer assigned to this project."
                            ),
                            { statusCode: 400 }
                        );
                    }

                    finalAssignees = uniqueAssigneeIds;
                }
            } else {
                // The creating Site Engineer is automatically assigned.
                finalAssignees = [creatorId];
            }

            // 8. Atomically generate the organization's task number
            const updatedOrganization = await Organization.findOneAndUpdate(
                {
                    _id: organizationId,
                    status: "active"
                },
                {
                    $inc: { taskSequence: 1 }
                },
                {
                    new: true,
                    session
                }
            ).select("taskSequence");

            if (!updatedOrganization) {
                throw new Error("Could not generate task number.");
            }

            const taskNumber =
                `TSK${String(updatedOrganization.taskSequence).padStart(6, "0")}`;

            // 9. Create task
            const tasks = await Task.create(
                [
                    {
                        taskNumber,
                        title: title.trim(),
                        description: description?.trim() || "",
                        projectId,
                        organizationId,
                        createdBy: creatorId,
                        createdByRole: creatorRole,
                        assignees: finalAssignees,
                        categoryId,
                        progressUnitId,
                        totalQuantity,
                        progressQuantity: 0,
                        startDate: startDate || null,
                        endDate: endDate || null,
                        status: "Pending"
                    }
                ],
                { session }
            );

            createdTask = tasks[0];

            // 10. Record task creation in activity timeline
            await TaskActivity.create(
                [
                    {
                        taskId: createdTask._id,
                        projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "TASK_CREATED",
                        description: `Task ${taskNumber} was created.`,
                        metadata: {
                            taskNumber,
                            title: createdTask.title,
                            initialAssignees: finalAssignees
                        }
                    }
                ],
                { session }
            );
        });

        emitToRooms(req.app.get("io"), "task:created", {
            task: createdTask
        }, {
            userIds: [founderId, creatorId, ...(createdTask.assignees || [])],
            taskId: createdTask._id
        });

        return res.status(201).json({
            success: true,
            message: "Task created successfully.",
            task: createdTask
        });

    } catch (error) {
        console.error("Create Task Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A task with this number already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not create task."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Get all tasks belonging to a project
exports.getTasks = async (req, res) => {
    try {
        const {
            projectId,
            search,
            status,
            categoryId,
            delayed,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authenticated user
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view tasks."
            });
        }

        // 2. Verify active organization
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        // 3. Verify active user
        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 4. Verify project
        const project = await Project.findOne({
            _id: projectId,
            organizationId
        }).select("contractor siteEngineers");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        // 5. Verify project access
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot access tasks for this project."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssignedToProject = project.siteEngineers.some(
                engineerId =>
                    engineerId.toString() === creatorId.toString()
            );

            if (!isAssignedToProject) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this project."
                });
            }
        }

        // 6. Build task filters
        const filter = {
            projectId,
            organizationId
        };

        if (status) {
            filter.status = status;
        }

        if (categoryId) {
            filter.categoryId = categoryId;
        }

        // Search by task title or task number
        if (search) {
            const escapedSearch = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                { title: { $regex: escapedSearch, $options: "i" } },
                { taskNumber: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        // 7. Delayed task filter
        if (delayed === true) {
            filter.endDate = { $lt: new Date() };
            filter.status = { $ne: "Completed" };
        } else if (delayed === false) {
            filter.$and = [
                ...(filter.$and || []),
                {
                    $or: [
                        { endDate: null },
                        { endDate: { $gte: new Date() } },
                        { status: "Completed" }
                    ]
                }
            ];
        }

        // 8. Pagination
        const currentPage = Number(page);
        const pageLimit = Number(limit);
        const skip = (currentPage - 1) * pageLimit;

        // 9. Sorting
        const sort = {
            [sortBy]: sortOrder === "asc" ? 1 : -1
        };

        // 10. Retrieve tasks and total count
        const [tasks, totalTasks] = await Promise.all([
            Task.find(filter)
                .populate("categoryId", "name icon")
                .populate("progressUnitId", "name abbreviation")
                .populate("assignees", "name email role")
                .populate("createdBy", "name email role")
                .sort(sort)
                .skip(skip)
                .limit(pageLimit),

            Task.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            pagination: {
                currentPage,
                limit: pageLimit,
                totalTasks,
                totalPages: Math.ceil(totalTasks / pageLimit),
                hasNextPage: currentPage * pageLimit < totalTasks,
                hasPreviousPage: currentPage > 1
            },
            count: tasks.length,
            tasks
        });

    } catch (error) {
        console.error("Get Tasks Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve tasks."
        });
    }
};

// get a task by id
exports.getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this task."
            });
        }

        // 2. Verify active organization
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        // 3. Verify active user
        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 4. Find task within the user's organization
        const task = await Task.findOne({
            _id: id,
            organizationId
        })
            .populate("categoryId", "name description icon")
            .populate("progressUnitId", "name abbreviation description")
            .populate("assignees", "name email role status")
            .populate("createdBy", "name email role")
            .populate(
                "projectId",
                "title description status startDate endDate contractor siteEngineers"
            );

        if (!task || !task.projectId) {
            return res.status(404).json({
                success: false,
                message: "Task or associated project not found."
            });
        }

        const project = task.projectId;

        // 5. Verify project access
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot access this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssignedToProject = project.siteEngineers.some(
                engineerId =>
                    engineerId.toString() === creatorId.toString()
            );

            if (!isAssignedToProject) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this project."
                });
            }
        }

        // Generate temporary URLs for task attachments
        const taskData = task.toObject();

        taskData.attachments = await Promise.all(
            (taskData.attachments || []).map(async attachment => ({
                ...attachment,
                url: await getImageUrl(attachment.key)
            }))
        );

        return res.status(200).json({
            success: true,
            task: taskData
        });
    } catch (error) {
        console.error("Get Task By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve task details."
        });
    }
};
// update task
exports.updateTask = async (req, res) => {
    let session;

    try {
        const { id } = req.params;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update tasks."
            });
        }

        // 1. Allow only permitted fields
        const allowedFields = [
            "title",
            "description",
            "categoryId",
            "progressUnitId",
            "totalQuantity",
            "startDate",
            "endDate"
        ];

        const updates = {};

        allowedFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one valid field to update."
            });
        }

        session = await mongoose.startSession();

        let updatedTask;
        let recipientIds = [];

        await session.withTransaction(async () => {

            // 2. Verify active organization
            const organization = await Organization.findOne({
                _id: organizationId,
                status: "active"
            }).select("ownerId").session(session);

            if (!organization) {
                throw Object.assign(
                    new Error("Organization not found or inactive."),
                    { statusCode: 403 }
                );
            }

            // 3. Verify active user
            const user = await User.findOne({
                _id: creatorId,
                organizationId,
                role: creatorRole,
                status: "active"
            }).select("_id").session(session);

            if (!user) {
                throw Object.assign(
                    new Error("Active organization membership could not be verified."),
                    { statusCode: 403 }
                );
            }

            // 4. Find task
            const task = await Task.findOne({
                _id: id,
                organizationId
            }).session(session);

            if (!task) {
                throw Object.assign(
                    new Error("Task not found."),
                    { statusCode: 404 }
                );
            }

            // 5. Verify project
            const project = await Project.findOne({
                _id: task.projectId,
                organizationId
            }).session(session);

            if (!project) {
                throw Object.assign(
                    new Error("Associated project not found."),
                    { statusCode: 404 }
                );
            }

            recipientIds = taskParticipantIds(project, task);

            // 6. Verify access permissions
            if (creatorRole === "Founder") {
                if (
                    organization.ownerId.toString() !== creatorId.toString() ||
                    project.contractor.toString() !== creatorId.toString()
                ) {
                    throw Object.assign(
                        new Error("You cannot update this task."),
                        { statusCode: 403 }
                    );
                }
            }

            if (creatorRole === "Site Engineer") {
                const isAssigned = task.assignees.some(
                    assigneeId =>
                        assigneeId.toString() === creatorId.toString()
                );

                if (!isAssigned) {
                    throw Object.assign(
                        new Error("You are not assigned to this task."),
                        { statusCode: 403 }
                    );
                }
            }

            // 7. Verify category if being updated
            if (updates.categoryId) {
                const category = await TaskCategory.findOne({
                    _id: updates.categoryId,
                    organizationId,
                    isActive: true
                }).session(session);

                if (!category) {
                    throw Object.assign(
                        new Error("Invalid or inactive task category."),
                        { statusCode: 400 }
                    );
                }
            }

            // 8. Verify progress unit if being updated
            if (updates.progressUnitId) {
                const unit = await TaskUnit.findOne({
                    _id: updates.progressUnitId,
                    organizationId,
                    isActive: true
                }).session(session);

                if (!unit) {
                    throw Object.assign(
                        new Error("Invalid or inactive progress unit."),
                        { statusCode: 400 }
                    );
                }
            }

            // 9. Prevent total quantity from going below completed quantity
            const newTotalQuantity =
                updates.totalQuantity !== undefined
                    ? updates.totalQuantity
                    : task.totalQuantity;

            if (
                newTotalQuantity !== null &&
                newTotalQuantity < task.progressQuantity
            ) {
                throw Object.assign(
                    new Error(
                        "Total quantity cannot be less than completed progress quantity."
                    ),
                    { statusCode: 400 }
                );
            }

            // 10. Validate effective date range
            const effectiveStartDate =
                updates.startDate !== undefined
                    ? updates.startDate
                    : task.startDate;

            const effectiveEndDate =
                updates.endDate !== undefined
                    ? updates.endDate
                    : task.endDate;

            if (
                effectiveStartDate &&
                effectiveEndDate &&
                new Date(effectiveEndDate) < new Date(effectiveStartDate)
            ) {
                throw Object.assign(
                    new Error("End date cannot be before start date."),
                    { statusCode: 400 }
                );
            }

            // 11. Update task
            updatedTask = await Task.findOneAndUpdate(
                {
                    _id: id,
                    organizationId
                },
                {
                    $set: updates
                },
                {
                    new: true,
                    runValidators: true,
                    session
                }
            );

            // 12. Record activity
            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "TASK_UPDATED",
                        description: `Task ${task.taskNumber} was updated.`,
                        metadata: {
                            updatedFields: Object.keys(updates)
                        }
                    }
                ],
                { session }
            );
        });

        emitToRooms(req.app.get("io"), "task:updated", {
            task: updatedTask
        }, {
            userIds: recipientIds,
            taskId: updatedTask._id
        });

        return res.status(200).json({
            success: true,
            message: "Task updated successfully.",
            task: updatedTask
        });

    } catch (error) {
        console.error("Update Task Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not update task."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// delete task
exports.deleteTask = async (req, res) => {
    let session;

    try {
        const { id } = req.params;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete tasks."
            });
        }

        // 2. Verify active organization
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        // 3. Verify active user
        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 4. Find task within the organization
        const task = await Task.findOne({
            _id: id,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // 5. Verify associated project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        }).select("contractor");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Associated project not found."
            });
        }

        const recipientIds = taskParticipantIds(project, task);

        // 6. Verify deletion permissions
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot delete this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssigned = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === creatorId.toString()
            );

            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // 7. Retrieve related progress records and issues
        const [progressRecords, issues] = await Promise.all([
            TaskProgress.find({
                taskId: task._id,
                organizationId
            }).select("attachments"),

            TaskIssue.find({
                taskId: task._id,
                organizationId
            }).select("attachments")
        ]);

        // 8. Collect all S3 attachment keys
        const attachmentKeys = [
            ...(task.attachments || []).map(file => file.key),

            ...progressRecords.flatMap(progress =>
                (progress.attachments || []).map(file => file.key)
            ),

            ...issues.flatMap(issue =>
                (issue.attachments || []).map(file => file.key)
            )
        ];

        // Remove duplicate keys and empty values
        const uniqueKeys = [
            ...new Set(attachmentKeys.filter(Boolean))
        ];

        // 9. Delete S3 attachments before deleting database records
        const deletionResults = await Promise.allSettled(
            uniqueKeys.map(key => deleteImage(key))
        );

        const failedDeletions = deletionResults.filter(
            result => result.status === "rejected"
        );

        if (failedDeletions.length > 0) {
            console.error(
                "Some task attachments could not be deleted:",
                failedDeletions.map(result => result.reason)
            );

            return res.status(502).json({
                success: false,
                message: "Some task attachments could not be deleted. Please retry the deletion."
            });
        }

        // 10. Permanently delete all related database records
        session = await mongoose.startSession();

        await session.withTransaction(async () => {

            // Confirm task still exists before cascading deletion
            const existingTask = await Task.findOne({
                _id: task._id,
                organizationId
            }).session(session);

            if (!existingTask) {
                throw Object.assign(
                    new Error("Task has already been deleted."),
                    { statusCode: 404 }
                );
            }

            await TaskProgress.deleteMany(
                {
                    taskId: task._id,
                    organizationId
                },
                { session }
            );

            await TaskIssue.deleteMany(
                {
                    taskId: task._id,
                    organizationId
                },
                { session }
            );

            await TaskActivity.deleteMany(
                {
                    taskId: task._id,
                    organizationId
                },
                { session }
            );

            await Task.deleteOne(
                {
                    _id: task._id,
                    organizationId
                },
                { session }
            );
        });

        const io = req.app.get("io");
        emitToRooms(io, "task:deleted", {
            taskId: task._id,
            taskNumber: task.taskNumber
        }, {
            userIds: recipientIds,
            taskId: task._id
        });
        await clearRoom(io, taskRoom(task._id));

        return res.status(200).json({
            success: true,
            message: "Task and all related records permanently deleted.",
            deletedTask: {
                id: task._id,
                taskNumber: task.taskNumber
            },
            deletedAttachments: uniqueKeys.length
        });

    } catch (error) {
        console.error("Delete Task Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not delete task."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Add Site Engineers to an existing task
exports.addTaskAssignees = async (req, res) => {
    let session;

    try {
        const { id } = req.params;
        const { userIds } = req.body;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to assign task members."
            });
        }

        session = await mongoose.startSession();

        let updatedTask;
        let newlyAssignedIds = [];
        let alreadyAssignedIds = [];
        let recipientIds = [];

        await session.withTransaction(async () => {

            // 1. Verify active organization
            const organization = await Organization.findOne({
                _id: organizationId,
                status: "active"
            }).select("ownerId").session(session);

            if (!organization) {
                throw Object.assign(
                    new Error("Organization not found or inactive."),
                    { statusCode: 403 }
                );
            }

            // 2. Verify active user
            const creator = await User.findOne({
                _id: creatorId,
                organizationId,
                role: creatorRole,
                status: "active"
            }).select("_id").session(session);

            if (!creator) {
                throw Object.assign(
                    new Error("Active organization membership could not be verified."),
                    { statusCode: 403 }
                );
            }

            // 3. Find task
            const task = await Task.findOne({
                _id: id,
                organizationId
            }).session(session);

            if (!task) {
                throw Object.assign(
                    new Error("Task not found."),
                    { statusCode: 404 }
                );
            }

            // 4. Find associated project
            const project = await Project.findOne({
                _id: task.projectId,
                organizationId
            }).select("contractor siteEngineers").session(session);

            if (!project) {
                throw Object.assign(
                    new Error("Associated project not found."),
                    { statusCode: 404 }
                );
            }

            // 5. Verify who can add assignees
            if (creatorRole === "Founder") {
                if (
                    organization.ownerId.toString() !== creatorId.toString() ||
                    project.contractor.toString() !== creatorId.toString()
                ) {
                    throw Object.assign(
                        new Error("You cannot manage assignees for this task."),
                        { statusCode: 403 }
                    );
                }
            }

            if (creatorRole === "Site Engineer") {
                const isTaskAssignee = task.assignees.some(
                    assigneeId =>
                        assigneeId.toString() === creatorId.toString()
                );

                if (!isTaskAssignee) {
                    throw Object.assign(
                        new Error("Only an assigned Site Engineer can add task members."),
                        { statusCode: 403 }
                    );
                }
            }

            // 6. Verify all requested users are active Site Engineers
            const requestedIds = userIds.map(userId => userId.toString());

            const eligibleEngineers = await User.find({
                _id: { $in: requestedIds },
                organizationId,
                role: "Site Engineer",
                status: "active"
            }).select("_id").session(session);

            const eligibleIds = new Set(
                eligibleEngineers.map(user => user._id.toString())
            );

            const projectEngineerIds = new Set(
                project.siteEngineers.map(userId => userId.toString())
            );

            const allEligible = requestedIds.every(userId =>
                eligibleIds.has(userId) &&
                projectEngineerIds.has(userId)
            );

            if (!allEligible) {
                throw Object.assign(
                    new Error(
                        "Every assignee must be an active Site Engineer assigned to this project."
                    ),
                    { statusCode: 400 }
                );
            }

            // 7. Separate new and already assigned users
            const existingAssigneeIds = new Set(
                task.assignees.map(userId => userId.toString())
            );

            newlyAssignedIds = requestedIds.filter(
                userId => !existingAssigneeIds.has(userId)
            );

            alreadyAssignedIds = requestedIds.filter(
                userId => existingAssigneeIds.has(userId)
            );
            recipientIds = taskParticipantIds(
                project,
                task,
                newlyAssignedIds
            );

            // 8. Add new assignees
            if (newlyAssignedIds.length > 0) {
                updatedTask = await Task.findOneAndUpdate(
                    {
                        _id: task._id,
                        organizationId
                    },
                    {
                        $addToSet: {
                            assignees: {
                                $each: newlyAssignedIds
                            }
                        }
                    },
                    {
                        new: true,
                        session,
                        runValidators: true
                    }
                );

                // 9. Record each new assignment in activity history
                const activities = newlyAssignedIds.map(userId => ({
                    taskId: task._id,
                    projectId: task.projectId,
                    organizationId,
                    performedBy: creatorId,
                    performedByRole: creatorRole,
                    action: "ASSIGNEE_ADDED",
                    description: `A Site Engineer was assigned to task ${task.taskNumber}.`,
                    metadata: {
                        assigneeId: userId
                    }
                }));

                await TaskActivity.create(activities, { session });
            } else {
                updatedTask = task;
            }
        });

        if (newlyAssignedIds.length > 0) {
            emitToRooms(req.app.get("io"), "task:assignee-added", {
                taskId: updatedTask._id,
                assigneeIds: newlyAssignedIds,
                task: updatedTask
            }, {
                userIds: recipientIds,
                taskId: updatedTask._id
            });
        }

        return res.status(200).json({
            success: true,
            message: newlyAssignedIds.length > 0
                ? "Task assignees added successfully."
                : "All requested users are already assigned.",
            newlyAssigned: newlyAssignedIds,
            alreadyAssigned: alreadyAssignedIds,
            task: updatedTask
        });

    } catch (error) {
        console.error("Add Task Assignees Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not add task assignees."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Remove a Site Engineer from a task
exports.removeTaskAssignee = async (req, res) => {
    let session;

    try {
        const { id } = req.params;
        const { userId } = req.body;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        // 2. Only Founder can remove assignees
        if (creatorRole !== "Founder") {
            return res.status(403).json({
                success: false,
                message: "Only the Founder can remove task assignees."
            });
        }

        session = await mongoose.startSession();

        let updatedTask;
        let recipientIds = [];

        await session.withTransaction(async () => {

            // 3. Verify active organization
            const organization = await Organization.findOne({
                _id: organizationId,
                status: "active"
            }).select("ownerId").session(session);

            if (!organization) {
                throw Object.assign(
                    new Error("Organization not found or inactive."),
                    { statusCode: 403 }
                );
            }

            // 4. Verify active Founder
            const founder = await User.findOne({
                _id: creatorId,
                organizationId,
                role: "Founder",
                status: "active"
            }).select("_id").session(session);

            if (!founder) {
                throw Object.assign(
                    new Error("Active Founder membership could not be verified."),
                    { statusCode: 403 }
                );
            }

            if (organization.ownerId.toString() !== creatorId.toString()) {
                throw Object.assign(
                    new Error("You are not the owner of this organization."),
                    { statusCode: 403 }
                );
            }

            // 5. Find task
            const task = await Task.findOne({
                _id: id,
                organizationId
            }).session(session);

            if (!task) {
                throw Object.assign(
                    new Error("Task not found."),
                    { statusCode: 404 }
                );
            }

            // 6. Verify associated project and Founder ownership
            const project = await Project.findOne({
                _id: task.projectId,
                organizationId
            }).select("contractor").session(session);

            if (!project) {
                throw Object.assign(
                    new Error("Associated project not found."),
                    { statusCode: 404 }
                );
            }

            recipientIds = taskParticipantIds(project, task, [userId]);

            if (project.contractor.toString() !== creatorId.toString()) {
                throw Object.assign(
                    new Error("You cannot manage assignees for this task."),
                    { statusCode: 403 }
                );
            }

            // 7. Verify the Site Engineer is currently assigned
            const isAssigned = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === userId.toString()
            );

            if (!isAssigned) {
                throw Object.assign(
                    new Error("This Site Engineer is not assigned to the task."),
                    { statusCode: 404 }
                );
            }

            // 8. Remove the Site Engineer
            updatedTask = await Task.findOneAndUpdate(
                {
                    _id: task._id,
                    organizationId
                },
                {
                    $pull: {
                        assignees: userId
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            // 9. Record assignment removal in activity history
            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "ASSIGNEE_REMOVED",
                        description: `A Site Engineer was removed from task ${task.taskNumber}.`,
                        metadata: {
                            assigneeId: userId
                        }
                    }
                ],
                { session }
            );
        });

        const io = req.app.get("io");
        await removeUserFromTaskRoom(io, userId, id);
        emitToRooms(io, "task:assignee-removed", {
            taskId: updatedTask._id,
            assigneeId: userId,
            task: updatedTask
        }, {
            userIds: recipientIds,
            taskId: updatedTask._id
        });

        return res.status(200).json({
            success: true,
            message: "Site Engineer removed from task successfully.",
            removedUserId: userId,
            task: updatedTask
        });

    } catch (error) {
        console.error("Remove Task Assignee Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not remove task assignee."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Create a progress update for a task
exports.createTaskProgress = async (req, res) => {
    let session;

    try {
        const { id } = req.params;
        const { completedQuantity, description } = req.body;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update task progress."
            });
        }

        session = await mongoose.startSession();

        let createdProgress;
        let updatedTask;
        let recipientIds = [];

        await session.withTransaction(async () => {

            // 2. Verify active organization
            const organization = await Organization.findOne({
                _id: organizationId,
                status: "active"
            }).select("ownerId").session(session);

            if (!organization) {
                throw Object.assign(
                    new Error("Organization not found or inactive."),
                    { statusCode: 403 }
                );
            }

            // 3. Verify active user
            const creator = await User.findOne({
                _id: creatorId,
                organizationId,
                role: creatorRole,
                status: "active"
            }).select("_id").session(session);

            if (!creator) {
                throw Object.assign(
                    new Error("Active organization membership could not be verified."),
                    { statusCode: 403 }
                );
            }

            // 4. Find task
            const task = await Task.findOne({
                _id: id,
                organizationId
            }).session(session);

            if (!task) {
                throw Object.assign(
                    new Error("Task not found."),
                    { statusCode: 404 }
                );
            }

            // 5. Verify associated project
            const project = await Project.findOne({
                _id: task.projectId,
                organizationId
            }).select("contractor").session(session);

            if (!project) {
                throw Object.assign(
                    new Error("Associated project not found."),
                    { statusCode: 404 }
                );
            }

            recipientIds = taskParticipantIds(project, task);

            // 6. Verify task access
            if (creatorRole === "Founder") {
                if (
                    organization.ownerId.toString() !== creatorId.toString() ||
                    project.contractor.toString() !== creatorId.toString()
                ) {
                    throw Object.assign(
                        new Error("You cannot update progress for this task."),
                        { statusCode: 403 }
                    );
                }
            }

            if (creatorRole === "Site Engineer") {
                const isAssigned = task.assignees.some(
                    assigneeId =>
                        assigneeId.toString() === creatorId.toString()
                );

                if (!isAssigned) {
                    throw Object.assign(
                        new Error("You are not assigned to this task."),
                        { statusCode: 403 }
                    );
                }
            }

            // 7. Prevent progress updates on completed tasks
            if (task.status === "Completed") {
                throw Object.assign(
                    new Error("This task is already completed."),
                    { statusCode: 400 }
                );
            }

            // 8. Calculate cumulative progress
            const currentProgress = task.progressQuantity || 0;
            const totalQuantity = task.totalQuantity;

            const newProgress = currentProgress + completedQuantity;

            if (newProgress > totalQuantity) {
                throw Object.assign(
                    new Error(
                        `Progress cannot exceed the total task quantity of ${totalQuantity}.`
                    ),
                    { statusCode: 400 }
                );
            }

            // 9. Create progress record
            const progressRecords = await TaskProgress.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        updatedBy: creatorId,
                        updatedByRole: creatorRole,
                        completedQuantity,
                        description: description?.trim() || "",
                        attachments: []
                    }
                ],
                { session }
            );

            createdProgress = progressRecords[0];

            // 10. Determine updated task status
            const isCompleted = newProgress >= totalQuantity;

            const updateFields = {
                progressQuantity: newProgress,
                status: isCompleted ? "Completed" : "In Progress"
            };

            if (isCompleted) {
                updateFields.completedAt = new Date();
            }

            // 11. Update parent task
            updatedTask = await Task.findOneAndUpdate(
                {
                    _id: task._id,
                    organizationId,
                    status: { $ne: "Completed" },
                    progressQuantity: currentProgress
                },
                {
                    $set: updateFields
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            if (!updatedTask) {
                throw Object.assign(
                    new Error("Task progress changed concurrently. Please retry."),
                    { statusCode: 409 }
                );
            }

            // 12. Record activity
            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "PROGRESS_UPDATED",
                        description: `Progress updated by ${completedQuantity} units for task ${task.taskNumber}.`,
                        metadata: {
                            completedQuantity,
                            previousProgress: currentProgress,
                            currentProgress: newProgress,
                            totalQuantity,
                            status: updatedTask.status
                        }
                    }
                ],
                { session }
            );
        });

        emitToRooms(req.app.get("io"), "task:progress-updated", {
            taskId: updatedTask._id,
            progress: createdProgress,
            task: updatedTask
        }, {
            userIds: recipientIds,
            taskId: updatedTask._id
        });

        return res.status(201).json({
            success: true,
            message: "Task progress recorded successfully.",
            progress: createdProgress,
            task: {
                id: updatedTask._id,
                taskNumber: updatedTask.taskNumber,
                progressQuantity: updatedTask.progressQuantity,
                totalQuantity: updatedTask.totalQuantity,
                status: updatedTask.status,
                completedAt: updatedTask.completedAt
            }
        });

    } catch (error) {
        console.error("Create Task Progress Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not record task progress."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Get progress history for a task
exports.getTaskProgress = async (req, res) => {
    try {
        const { id } = req.params;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view task progress."
            });
        }

        // 2. Verify active organization
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        // 3. Verify active user
        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 4. Find task
        const task = await Task.findOne({
            _id: id,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // 5. Verify associated project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        }).select("contractor");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Associated project not found."
            });
        }

        // 6. Verify task access
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot view progress for this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssigned = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === creatorId.toString()
            );

            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // 7. Retrieve progress history and total count
        const filter = {
            taskId: task._id,
            organizationId
        };

        const [progressRecords, totalRecords] = await Promise.all([
            TaskProgress.find(filter)
                .populate("updatedBy", "name email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            TaskProgress.countDocuments(filter)
        ]);

        // 8. Generate temporary URLs for progress attachments
        const progressRecordsWithUrls = await Promise.all(
            progressRecords.map(async (record) => {
                const progressData = record.toObject();

                progressData.attachments = await Promise.all(
                    (progressData.attachments || []).map(async (attachment) => ({
                        ...attachment,
                        url: await getImageUrl(attachment.key)
                    }))
                );

                return progressData;
            })
        );

        // 9. Return progress history
        return res.status(200).json({
            success: true,
            task: {
                id: task._id,
                taskNumber: task.taskNumber,
                title: task.title,
                totalQuantity: task.totalQuantity,
                progressQuantity: task.progressQuantity,
                status: task.status
            },
            pagination: {
                currentPage: page,
                limit,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                hasNextPage: page * limit < totalRecords,
                hasPreviousPage: page > 1
            },
            count: progressRecordsWithUrls.length,
            progressRecords: progressRecordsWithUrls
        });

    } catch (error) {
        console.error("Get Task Progress Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve task progress history."
        });
    }
};

// Upload photos to an existing task progress record
exports.uploadTaskProgressAttachments = async (req, res) => {
    let session;
    let uploadedKeys = [];

    try {
        const { id, progressId } = req.params;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        const files = req.files || [];

        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to upload progress photos."
            });
        }

        if (files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one image."
            });
        }

        // 1. Verify active organization and user
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 2. Find task
        const task = await Task.findOne({
            _id: id,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // 3. Verify project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        }).select("contractor");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Associated project not found."
            });
        }

        // 4. Verify task access
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot upload photos for this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssigned = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === creatorId.toString()
            );

            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // 5. Verify progress record belongs to this task
        const progress = await TaskProgress.findOne({
            _id: progressId,
            taskId: task._id,
            organizationId
        });

        if (!progress) {
            return res.status(404).json({
                success: false,
                message: "Progress record not found."
            });
        }

        // 6. Upload images to private S3 storage
        const uploadResults = await Promise.allSettled(
            files.map(file =>
                uploadImage({
                    file,
                    folder: `tasks/${task._id}/progress/${progress._id}`
                })
            )
        );

        uploadedKeys = uploadResults
            .filter(result => result.status === "fulfilled")
            .map(result => result.value.key);

        const failedUploads = uploadResults.filter(
            result => result.status === "rejected"
        );

        if (failedUploads.length > 0) {
            await Promise.allSettled(
                uploadedKeys.map(key => deleteImage(key))
            );

            uploadedKeys = [];

            return res.status(502).json({
                success: false,
                message: "Some images could not be uploaded. Please retry."
            });
        }

        // 7. Prepare attachment metadata
        const attachments = files.map((file, index) => ({
            key: uploadedKeys[index],
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date()
        }));

        // 8. Save attachment metadata and activity transactionally
        session = await mongoose.startSession();

        let updatedProgress;

        await session.withTransaction(async () => {

            // Confirm task and progress still exist
            const existingProgress = await TaskProgress.findOne({
                _id: progress._id,
                taskId: task._id,
                organizationId
            }).session(session);

            if (!existingProgress) {
                throw Object.assign(
                    new Error("Progress record no longer exists."),
                    { statusCode: 404 }
                );
            }

            updatedProgress = await TaskProgress.findOneAndUpdate(
                {
                    _id: progress._id,
                    taskId: task._id,
                    organizationId
                },
                {
                    $push: {
                        attachments: {
                            $each: attachments
                        }
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "ATTACHMENT_ADDED",
                        description: `${attachments.length} progress photo(s) uploaded for task ${task.taskNumber}.`,
                        metadata: {
                            progressId: progress._id,
                            attachmentCount: attachments.length,
                            attachmentKeys: uploadedKeys
                        }
                    }
                ],
                { session }
            );
        });

        emitToRooms(req.app.get("io"), "task:attachment-added", {
            taskId: task._id,
            progressId: progress._id,
            attachments
        }, {
            userIds: taskParticipantIds(project, task),
            taskId: task._id
        });

        return res.status(201).json({
            success: true,
            message: "Progress photos uploaded successfully.",
            count: attachments.length,
            attachments: updatedProgress.attachments
        });

    } catch (error) {
        console.error("Upload Task Progress Attachments Error:", error);

        // Clean up uploaded files if database saving fails
        if (uploadedKeys.length > 0) {
            await Promise.allSettled(
                uploadedKeys.map(key => deleteImage(key))
            );
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not upload progress photos."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Upload photos directly to a task
exports.uploadTaskAttachments = async (req, res) => {
    let session;
    let uploadedKeys = [];

    try {
        const { id } = req.params;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        const files = req.files || [];

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to upload task photos."
            });
        }

        if (files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one image."
            });
        }

        // 2. Verify active organization and user
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 3. Find task
        const task = await Task.findOne({
            _id: id,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // 4. Verify associated project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        }).select("contractor");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Associated project not found."
            });
        }

        // 5. Verify task access
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot upload photos for this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssigned = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === creatorId.toString()
            );

            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // 6. Upload photos to private S3
        const uploadResults = await Promise.allSettled(
            files.map(file =>
                uploadImage({
                    file,
                    folder: `tasks/${task._id}/attachments`
                })
            )
        );

        uploadedKeys = uploadResults
            .filter(result => result.status === "fulfilled")
            .map(result => result.value.key);

        const failedUploads = uploadResults.filter(
            result => result.status === "rejected"
        );

        if (failedUploads.length > 0) {
            await Promise.allSettled(
                uploadedKeys.map(key => deleteImage(key))
            );

            uploadedKeys = [];

            return res.status(502).json({
                success: false,
                message: "Some images could not be uploaded. Please retry."
            });
        }

        // 7. Prepare attachment metadata
        const attachments = files.map((file, index) => ({
            key: uploadedKeys[index],
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: creatorId,
            uploadedAt: new Date()
        }));

        // 8. Save attachments and activity transactionally
        session = await mongoose.startSession();

        let updatedTask;

        await session.withTransaction(async () => {
            const existingTask = await Task.findOne({
                _id: task._id,
                organizationId
            }).session(session);

            if (!existingTask) {
                throw Object.assign(
                    new Error("Task no longer exists."),
                    { statusCode: 404 }
                );
            }

            updatedTask = await Task.findOneAndUpdate(
                {
                    _id: task._id,
                    organizationId
                },
                {
                    $push: {
                        attachments: {
                            $each: attachments
                        }
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "ATTACHMENT_ADDED",
                        description: `${attachments.length} photo(s) uploaded to task ${task.taskNumber}.`,
                        metadata: {
                            attachmentCount: attachments.length,
                            attachmentKeys: uploadedKeys
                        }
                    }
                ],
                { session }
            );
        });

        // 9. Generate temporary viewing URLs
        const attachmentsWithUrls = await Promise.all(
            attachments.map(async attachment => ({
                ...attachment,
                url: await getImageUrl(attachment.key)
            }))
        );

        emitToRooms(req.app.get("io"), "task:attachment-added", {
            taskId: task._id,
            attachments: attachmentsWithUrls
        }, {
            userIds: taskParticipantIds(project, task),
            taskId: task._id
        });

        return res.status(201).json({
            success: true,
            message: "Task photos uploaded successfully.",
            count: attachmentsWithUrls.length,
            attachments: attachmentsWithUrls
        });

    } catch (error) {
        console.error("Upload Task Attachments Error:", error);

        // Clean up S3 files if database saving fails
        if (uploadedKeys.length > 0) {
            await Promise.allSettled(
                uploadedKeys.map(key => deleteImage(key))
            );
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not upload task photos."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Remove an individual photo from a task
exports.removeTaskAttachment = async (req, res) => {
    let session;

    try {
        const { id, attachmentId } = req.params;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        // 1. Verify authentication context
        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to remove task photos."
            });
        }

        if (!mongoose.isValidObjectId(attachmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attachment ID."
            });
        }

        // 2. Verify active organization
        const organization = await Organization.findOne({
            _id: organizationId,
            status: "active"
        }).select("ownerId");

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        // 3. Verify active user
        const user = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 4. Find task
        const task = await Task.findOne({
            _id: id,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // 5. Verify associated project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        }).select("contractor");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Associated project not found."
            });
        }

        // 6. Verify permissions
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot remove photos from this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssigned = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === creatorId.toString()
            );

            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // 7. Find attachment
        const attachment = task.attachments.id(attachmentId);

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: "Task attachment not found."
            });
        }

        const attachmentKey = attachment.key;
        const attachmentName = attachment.originalName;

        // 8. Delete photo from private S3
        try {
            await deleteImage(attachmentKey);
        } catch (s3Error) {
            console.error("S3 Attachment Deletion Error:", s3Error);

            return res.status(502).json({
                success: false,
                message: "Could not delete the photo from storage. Please retry."
            });
        }

        // 9. Remove attachment and record activity
        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const existingTask = await Task.findOne({
                _id: task._id,
                organizationId
            }).session(session);

            if (!existingTask) {
                throw Object.assign(
                    new Error("Task no longer exists."),
                    { statusCode: 404 }
                );
            }

            const existingAttachment =
                existingTask.attachments.id(attachmentId);

            if (!existingAttachment) {
                throw Object.assign(
                    new Error("Task attachment no longer exists."),
                    { statusCode: 404 }
                );
            }

            existingTask.attachments.pull(attachmentId);

            await existingTask.save({ session });

            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "ATTACHMENT_REMOVED",
                        description: `Photo removed from task ${task.taskNumber}.`,
                        metadata: {
                            attachmentId,
                            attachmentKey,
                            originalName: attachmentName
                        }
                    }
                ],
                { session }
            );
        });

        emitToRooms(req.app.get("io"), "task:attachment-removed", {
            taskId: task._id,
            attachmentId,
            attachmentName
        }, {
            userIds: taskParticipantIds(project, task),
            taskId: task._id
        });

        return res.status(200).json({
            success: true,
            message: "Task photo removed successfully.",
            removedAttachmentId: attachmentId
        });

    } catch (error) {
        console.error("Remove Task Attachment Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not remove task photo."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// get Task Activity
exports.getTaskActivity = async (req, res) => {
    try {
        const { id } = req.params;

        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Verify role
        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this activity."
            });
        }

        // Verify active organization
        const organization = await Organization.findOne({
            _id: organizationId,
            isActive: true
        });

        if (!organization) {
            return res.status(403).json({
                success: false,
                message: "Organization is inactive or does not exist."
            });
        }

        // Verify active user
        const user = await User.findOne({
            _id: userId,
            organizationId,
            isActive: true
        });

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "User is inactive or does not belong to this organization."
            });
        }

        // Find task
        const task = await Task.findOne({
            _id: id,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // Find parent project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        // Verify task access
        if (role === "Founder") {
            if (
                String(organization.ownerId) !== String(userId) ||
                String(project.contractor) !== String(userId)
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this project."
                });
            }
        } else {
            const isAssigned = task.assignees.some(
                assignee => String(assignee) === String(userId)
            );

            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // Retrieve task activity
        const filter = {
            taskId: task._id,
            projectId: task.projectId,
            organizationId
        };

        const [activities, totalActivities] = await Promise.all([
            TaskActivity.find(filter)
                .populate("performedBy", "name email role")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            TaskActivity.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Task activity retrieved successfully.",
            data: {
                task: {
                    _id: task._id,
                    taskNumber: task.taskNumber,
                    title: task.title
                },
                activities,
                pagination: {
                    currentPage: page,
                    limit,
                    totalActivities,
                    totalPages: Math.ceil(totalActivities / limit),
                    hasNextPage: page * limit < totalActivities,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error("Get Task Activity Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve task activity.",
            error: error.message
        });
    }
};
