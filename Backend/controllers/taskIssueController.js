
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Project = require("../models/project");
const User = require("../models/user");
const Organization = require("../models/Organization");
const TaskIssue = require("../models/TaskIssue");
const TaskActivity = require("../models/TaskActivity");

const {
    uploadImage,
    deleteImage,
    getImageUrl
} = require("../services/s3Service");
const {
    emitToRooms,
    taskParticipantIds
} = require("../utils/socketRooms");

// Create an issue for a task
exports.createTaskIssue = async (req, res) => {
    let session;

    try {
        const { id: taskId } = req.params;
        const {
            title,
            description,
            dueDate,
            assignedTo,
            tags = []
        } = req.body;

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
                message: "You are not authorized to create issues."
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

        // 3. Verify active creator
        const creator = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id");

        if (!creator) {
            return res.status(403).json({
                success: false,
                message: "Active organization membership could not be verified."
            });
        }

        // 4. Find task
        const task = await Task.findOne({
            _id: taskId,
            organizationId
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        // 5. Find associated project
        const project = await Project.findOne({
            _id: task.projectId,
            organizationId
        }).select("contractor siteEngineers");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Associated project not found."
            });
        }

        // 6. Verify creator's task access
        if (creatorRole === "Founder") {
            if (
                organization.ownerId.toString() !== creatorId.toString() ||
                project.contractor.toString() !== creatorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot create issues for this task."
                });
            }
        }

        if (creatorRole === "Site Engineer") {
            const isAssignedToTask = task.assignees.some(
                assigneeId =>
                    assigneeId.toString() === creatorId.toString()
            );

            if (!isAssignedToTask) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // 7. Verify assigned Site Engineer
        const assignedEngineer = await User.findOne({
            _id: assignedTo,
            organizationId,
            role: "Site Engineer",
            status: "active"
        }).select("_id name email");

        if (!assignedEngineer) {
            return res.status(400).json({
                success: false,
                message: "Assigned user must be an active Site Engineer in your organization."
            });
        }

        // The assigned engineer must belong to the parent project
        const isAssignedToProject = project.siteEngineers.some(
            engineerId =>
                engineerId.toString() === assignedTo.toString()
        );

        if (!isAssignedToProject) {
            return res.status(400).json({
                success: false,
                message: "The assigned Site Engineer is not assigned to this project."
            });
        }

        // 8. Create issue and activity records transactionally
        session = await mongoose.startSession();

        let createdIssue;

        await session.withTransaction(async () => {
            const issues = await TaskIssue.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        raisedBy: creatorId,
                        raisedByRole: creatorRole,
                        assignedTo,
                        title: title.trim(),
                        description: description?.trim() || "",
                        dueDate: dueDate || null,
                        tags,
                        status: "Open"
                    }
                ],
                { session }
            );

            createdIssue = issues[0];

            // Record issue creation
            await TaskActivity.create(
                [
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "ISSUE_CREATED",
                        description: `Issue "${createdIssue.title}" was created for task ${task.taskNumber}.`,
                        metadata: {
                            issueId: createdIssue._id,
                            title: createdIssue.title,
                            assignedTo
                        }
                    },
                    {
                        taskId: task._id,
                        projectId: task.projectId,
                        organizationId,
                        performedBy: creatorId,
                        performedByRole: creatorRole,
                        action: "ISSUE_ASSIGNED",
                        description: `Issue "${createdIssue.title}" was assigned to ${assignedEngineer.name}.`,
                        metadata: {
                            issueId: createdIssue._id,
                            assignedTo
                        }
                    }
                ],
                { session }
            );
        });

        // 9. Populate issue details
        const populatedIssue = await TaskIssue.findById(createdIssue._id)
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role");

        emitToRooms(req.app.get("io"), "task:issue-created", {
            taskId: task._id,
            issue: populatedIssue
        }, {
            userIds: taskParticipantIds(project, task, [
                creatorId,
                assignedEngineer._id
            ]),
            taskId: task._id
        });

        return res.status(201).json({
            success: true,
            message: "Task issue created successfully.",
            issue: populatedIssue
        });

    } catch (error) {
        console.error("Create Task Issue Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Could not create task issue."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Get all issues belonging to a task
exports.getTaskIssues = async (req, res) => {
    try {
        const { id: taskId } = req.params;

        const {
            search,
            status,
            page = 1,
            limit = 10
        } = req.query;

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
                message: "You are not authorized to view task issues."
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
            _id: taskId,
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
                    message: "You cannot view issues for this task."
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

        // 7. Build issue filters
        const filter = {
            taskId: task._id,
            organizationId
        };

        if (status) {
            filter.status = status;
        }

        if (search) {
            const escapedSearch = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                { title: { $regex: escapedSearch, $options: "i" } },
                { description: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        // 8. Pagination
        const currentPage = Number(page);
        const pageLimit = Number(limit);
        const skip = (currentPage - 1) * pageLimit;

        // 9. Retrieve issues and total count
        const [issues, totalIssues] = await Promise.all([
            TaskIssue.find(filter)
                .populate("raisedBy", "name email role")
                .populate("assignedTo", "name email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageLimit),

            TaskIssue.countDocuments(filter)
        ]);

        // 10. Return issues
        return res.status(200).json({
            success: true,
            task: {
                id: task._id,
                taskNumber: task.taskNumber,
                title: task.title
            },
            pagination: {
                currentPage,
                limit: pageLimit,
                totalIssues,
                totalPages: Math.ceil(totalIssues / pageLimit),
                hasNextPage: currentPage * pageLimit < totalIssues,
                hasPreviousPage: currentPage > 1
            },
            count: issues.length,
            issues
        });

    } catch (error) {
        console.error("Get Task Issues Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve task issues."
        });
    }
};

// Get a single task issue by ID
exports.getTaskIssueById = async (req, res) => {
    try {
        const { id, issueId } = req.params;

        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        // Verify user role
        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this issue."
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

        // Verify project/task access
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

        // Find issue
        const issue = await TaskIssue.findOne({
            _id: issueId,
            taskId: task._id,
            organizationId
        })
            .populate("raisedBy", "name email role")
            .populate("assignedTo", "name email role")
            .populate("resolvedBy", "name email role");

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found."
            });
        }


        const issueData = issue.toObject();

        issueData.attachments = await Promise.all(
            (issue.attachments || []).map(async attachment => ({
                ...attachment,
                url: await getImageUrl(attachment.key)
            }))
        );


        return res.status(200).json({
            success: true,
            message: "Issue retrieved successfully.",
            data: {
                issue: issueData,
                task: {
                    _id: task._id,
                    taskNumber: task.taskNumber,
                    title: task.title
                },
                project: {
                    _id: project._id,
                    title: project.title
                }
            }
        });

    } catch (error) {
        console.error("Get Task Issue By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve issue.",
            error: error.message
        });
    }
};

// Update the task
exports.updateTaskIssue = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id, issueId } = req.params;
        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this issue."
            });
        }

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

        const issue = await TaskIssue.findOne({
            _id: issueId,
            taskId: task._id,
            organizationId
        });

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found."
            });
        }

        const allowedFields = [
            "title",
            "description",
            "dueDate",
            "tags"
        ];

        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update."
            });
        }

        await session.withTransaction(async () => {
            const updatedIssue = await TaskIssue.findOneAndUpdate(
                {
                    _id: issueId,
                    taskId: task._id,
                    organizationId
                },
                { $set: updates },
                {
                    new: true,
                    runValidators: true,
                    session
                }
            )
                .populate("raisedBy", "name email role")
                .populate("assignedTo", "name email role");

            await TaskActivity.create(
                [{
                    taskId: task._id,
                    projectId: task.projectId,
                    organizationId,
                    performedBy: userId,
                    performedByRole: role,
                    action: "ISSUE_UPDATED",
                    description: "Updated issue details.",
                    metadata: {
                        issueId: issue._id,
                        updatedFields: Object.keys(updates)
                    }
                }],
                { session }
            );

            req.updatedIssue = updatedIssue;
        });

        emitToRooms(req.app.get("io"), "task:issue-updated", {
            taskId: task._id,
            issue: req.updatedIssue
        }, {
            userIds: taskParticipantIds(project, task, [
                issue.raisedBy,
                issue.assignedTo
            ]),
            taskId: task._id
        });

        return res.status(200).json({
            success: true,
            message: "Issue updated successfully.",
            data: req.updatedIssue
        });

    } catch (error) {
        console.error("Update Task Issue Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update issue.",
            error: error.message
        });
    } finally {
        await session.endSession();
    }
};

// reassignTaskIssue
exports.reassignTaskIssue = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id, issueId } = req.params;
        const { assignedTo } = req.body;

        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to reassign this issue."
            });
        }

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

        // Verify the actor's permission
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
            const isAssignedToTask = task.assignees.some(
                assignee => String(assignee) === String(userId)
            );

            if (!isAssignedToTask) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this task."
                });
            }
        }

        // Verify the new assignee
        const newAssignee = await User.findOne({
            _id: assignedTo,
            organizationId,
            role: "Site Engineer",
            isActive: true
        });

        if (!newAssignee) {
            return res.status(404).json({
                success: false,
                message: "Active Site Engineer not found in this organization."
            });
        }

        // New assignee must belong to the parent project
        const isAssignedToProject = project.siteEngineers.some(
            engineer => String(engineer) === String(assignedTo)
        );

        if (!isAssignedToProject) {
            return res.status(400).json({
                success: false,
                message: "The selected Site Engineer is not assigned to this project."
            });
        }

        const issue = await TaskIssue.findOne({
            _id: issueId,
            taskId: task._id,
            organizationId
        });

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found."
            });
        }

        if (String(issue.assignedTo) === String(assignedTo)) {
            return res.status(400).json({
                success: false,
                message: "This Site Engineer is already assigned to the issue."
            });
        }

        const previousAssigneeId = issue.assignedTo;

        await session.withTransaction(async () => {
            const updatedIssue = await TaskIssue.findOneAndUpdate(
                {
                    _id: issueId,
                    taskId: task._id,
                    organizationId
                },
                {
                    $set: {
                        assignedTo
                    }
                },
                {
                    new: true,
                    runValidators: true,
                    session
                }
            )
                .populate("raisedBy", "name email role")
                .populate("assignedTo", "name email role");

            await TaskActivity.create(
                [{
                    taskId: task._id,
                    projectId: task.projectId,
                    organizationId,
                    performedBy: userId,
                    performedByRole: role,
                    action: "ISSUE_ASSIGNED",
                    description: "Reassigned the issue to another Site Engineer.",
                    metadata: {
                        issueId: issue._id,
                        previousAssignee: previousAssigneeId,
                        newAssignee: assignedTo
                    }
                }],
                { session }
            );

            req.updatedIssue = updatedIssue;
        });

        emitToRooms(req.app.get("io"), "task:issue-assigned", {
            taskId: task._id,
            issue: req.updatedIssue,
            previousAssigneeId,
            assignedTo: newAssignee._id
        }, {
            userIds: taskParticipantIds(project, task, [
                issue.raisedBy,
                previousAssigneeId,
                newAssignee._id
            ]),
            taskId: task._id
        });

        return res.status(200).json({
            success: true,
            message: "Issue reassigned successfully.",
            data: req.updatedIssue
        });

    } catch (error) {
        console.error("Reassign Task Issue Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reassign issue.",
            error: error.message
        });
    } finally {
        await session.endSession();
    }
};

// update issuse status
exports.updateTaskIssueStatus = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id, issueId } = req.params;
        const { status } = req.body;

        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this issue."
            });
        }

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

        // Verify access permissions
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

        const issue = await TaskIssue.findOne({
            _id: issueId,
            taskId: task._id,
            organizationId
        });

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found."
            });
        }

        if (issue.status === status) {
            return res.status(400).json({
                success: false,
                message: "Issue already has this status."
            });
        }

        const updates = { status };

        if (status === "Resolved") {
            updates.resolvedAt = new Date();
            updates.resolvedBy = userId;
        } else if (status === "Open" || status === "In Progress") {
            // Clear resolution details when reopening an issue
            updates.resolvedAt = null;
            updates.resolvedBy = null;
        }

        await session.withTransaction(async () => {
            const updatedIssue = await TaskIssue.findOneAndUpdate(
                {
                    _id: issueId,
                    taskId: task._id,
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
            )
                .populate("raisedBy", "name email role")
                .populate("assignedTo", "name email role")
                .populate("resolvedBy", "name email role");

            await TaskActivity.create(
                [{
                    taskId: task._id,
                    projectId: task.projectId,
                    organizationId,
                    performedBy: userId,
                    performedByRole: role,
                    action: "ISSUE_STATUS_UPDATED",
                    description: `Changed issue status from ${issue.status} to ${status}.`,
                    metadata: {
                        issueId: issue._id,
                        previousStatus: issue.status,
                        newStatus: status
                    }
                }],
                { session }
            );

            req.updatedIssue = updatedIssue;
        });

        emitToRooms(req.app.get("io"), "task:issue-status-updated", {
            taskId: task._id,
            issue: req.updatedIssue
        }, {
            userIds: taskParticipantIds(project, task, [
                issue.raisedBy,
                issue.assignedTo
            ]),
            taskId: task._id
        });

        return res.status(200).json({
            success: true,
            message: "Issue status updated successfully.",
            data: req.updatedIssue
        });

    } catch (error) {
        console.error("Update Task Issue Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update issue status.",
            error: error.message
        });
    } finally {
        await session.endSession();
    }
};

// upload TaskIssue Attachments
exports.uploadTaskIssueAttachments = async (req, res) => {
    const session = await mongoose.startSession();
    const uploadedKeys = [];

    try {
        const { id, issueId } = req.params;

        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to upload issue attachments."
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please upload at least one image."
            });
        }

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

        const issue = await TaskIssue.findOne({
            _id: issueId,
            taskId: task._id,
            organizationId
        });

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found."
            });
        }

        // Upload images to private S3
        const uploadResults = await Promise.allSettled(
            req.files.map(file =>
                uploadImage({
                    file,
                    folder: `tasks/${task._id}/issues/${issue._id}`
                })
            )
        );

        const failedUpload = uploadResults.some(
            result => result.status === "rejected"
        );

        uploadResults.forEach(result => {
            if (result.status === "fulfilled") {
                uploadedKeys.push(result.value.key);
            }
        });

        if (failedUpload) {
            await Promise.allSettled(
                uploadedKeys.map(key => deleteImage(key))
            );

            return res.status(502).json({
                success: false,
                message: "One or more images could not be uploaded."
            });
        }

        const attachments = req.files.map((file, index) => ({
            key: uploadResults[index].value.key,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date()
        }));

        await session.withTransaction(async () => {
            const updatedIssue = await TaskIssue.findOneAndUpdate(
                {
                    _id: issueId,
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
                    runValidators: true,
                    session
                }
            );

            if (!updatedIssue) {
                throw new Error("Issue not found during attachment update.");
            }

            await TaskActivity.create(
                [{
                    taskId: task._id,
                    projectId: task.projectId,
                    organizationId,
                    performedBy: userId,
                    performedByRole: role,
                    action: "ATTACHMENT_ADDED",
                    description: "Uploaded issue attachments.",
                    metadata: {
                        issueId: issue._id,
                        attachmentCount: attachments.length,
                        attachmentKeys: uploadedKeys
                    }
                }],
                { session }
            );

            req.updatedIssue = updatedIssue;
        });

        emitToRooms(req.app.get("io"), "task:issue-attachment-added", {
            taskId: task._id,
            issueId: issue._id,
            attachments
        }, {
            userIds: taskParticipantIds(project, task, [
                issue.raisedBy,
                issue.assignedTo
            ]),
            taskId: task._id
        });

        return res.status(201).json({
            success: true,
            message: "Issue attachments uploaded successfully.",
            data: {
                issueId,
                attachments
            }
        });

    } catch (error) {
        // Remove uploaded S3 files if database operation fails
        if (uploadedKeys.length > 0) {
            await Promise.allSettled(
                uploadedKeys.map(key => deleteImage(key))
            );
        }

        console.error("Upload Task Issue Attachments Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload issue attachments.",
            error: error.message
        });

    } finally {
        await session.endSession();
    }
};

// remove TaskIssue Attachment
exports.removeTaskIssueAttachment = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id, issueId, attachmentId } = req.params;

        const userId = req.user.User_id;
        const organizationId = req.user.organizationId;
        const role = req.user.role;

        if (!["Founder", "Site Engineer"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to remove this attachment."
            });
        }

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

        // Verify access permissions
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

        const issue = await TaskIssue.findOne({
            _id: issueId,
            taskId: task._id,
            organizationId
        });

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found."
            });
        }

        // Find attachment
        const attachment = issue.attachments.id(attachmentId);

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: "Attachment not found."
            });
        }

        const attachmentKey = attachment.key;
        const attachmentName = attachment.originalName;

        // Delete image from S3
        await deleteImage(attachmentKey);

        // Remove attachment and record activity
        await session.withTransaction(async () => {
            const updatedIssue = await TaskIssue.findOneAndUpdate(
                {
                    _id: issueId,
                    taskId: task._id,
                    organizationId
                },
                {
                    $pull: {
                        attachments: {
                            _id: attachmentId
                        }
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!updatedIssue) {
                throw new Error("Issue not found during attachment removal.");
            }

            await TaskActivity.create(
                [{
                    taskId: task._id,
                    projectId: task.projectId,
                    organizationId,
                    performedBy: userId,
                    performedByRole: role,
                    action: "ATTACHMENT_REMOVED",
                    description: "Removed an issue attachment.",
                    metadata: {
                        issueId: issue._id,
                        attachmentId,
                        attachmentName,
                        attachmentKey
                    }
                }],
                { session }
            );
        });

        emitToRooms(req.app.get("io"), "task:issue-attachment-removed", {
            taskId: task._id,
            issueId: issue._id,
            attachmentId,
            attachmentName
        }, {
            userIds: taskParticipantIds(project, task, [
                issue.raisedBy,
                issue.assignedTo
            ]),
            taskId: task._id
        });

        return res.status(200).json({
            success: true,
            message: "Issue attachment removed successfully.",
            data: {
                issueId,
                attachmentId,
                attachmentName
            }
        });

    } catch (error) {
        console.error("Remove Task Issue Attachment Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove issue attachment.",
            error: error.message
        });

    } finally {
        await session.endSession();
    }
};
