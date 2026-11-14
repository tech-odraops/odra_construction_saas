
const express = require("express");
const router = express.Router();

const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");
const upload = require("../middleware/uploadMiddleware");

const {
    validateCreateTask,
    validateGetTasks,
    validateTaskId,
    validateUpdateTask,
    validateAddTaskAssignees,
    validateRemoveTaskAssignee,
    handleTaskValidationErrors,
    validateGetTaskActivity
} = require("../middleware/taskValidation");

const {
    validateCreateTaskProgress,
    validateGetTaskProgress,
    handleTaskProgressValidationErrors
} = require("../middleware/taskProgressValidation");

const {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    addTaskAssignees,
    removeTaskAssignee,
    createTaskProgress,
    getTaskProgress,
    uploadTaskProgressAttachments,
    uploadTaskAttachments,
    removeTaskAttachment,
    getTaskActivity
} = require("../controllers/taskController");

const {
    validateCreateTaskIssue,
    validateTaskIssueId,
    validateGetTaskIssues,
    handleTaskIssueValidationErrors,
    validateTaskIssueParams,
    validateUpdateTaskIssue,
    validateReassignTaskIssue,
    validateUpdateTaskIssueStatus,
    validateRemoveTaskIssueAttachment
} = require("../middleware/taskIssueValidation");

const {
    createTaskIssue,
    getTaskIssues,
    getTaskIssueById,
    updateTaskIssue,
    reassignTaskIssue,
    updateTaskIssueStatus,
    removeTaskIssueAttachment,
    uploadTaskIssueAttachments,
} = require("../controllers/taskIssueController");

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Creates a task under a project. Founders can select eligible Site Engineers. Site Engineers are automatically assigned to tasks they create.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - projectId
 *               - categoryId
 *               - progressUnitId
 *               - totalQuantity
 *             properties:
 *               title:
 *                 type: string
 *                 example: Foundation excavation
 *               description:
 *                 type: string
 *                 example: Excavation work for the building foundation
 *               projectId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               progressUnitId:
 *                 type: string
 *               totalQuantity:
 *                 type: number
 *                 example: 500
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional Site Engineer IDs. Available during Founder-created task creation.
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation failed or invalid task details
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to create this task
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.post(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateCreateTask,
    handleTaskValidationErrors,
    createTask
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks for a project
 *     description: Retrieves tasks belonging to a project after verifying organization membership and project access.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB project ID
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *       400:
 *         description: Invalid project ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Project access denied
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.get(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateGetTasks,
    handleTaskValidationErrors,
    getTasks
);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task details by ID
 *     description: Retrieves a single task after verifying organization and project access.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *       400:
 *         description: Invalid task ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateTaskId,
    handleTaskValidationErrors,
    getTaskById
);

/**
 * @swagger
 * /tasks/{id}:
 *   patch:
 *     summary: Update task details
 *     description: Updates permitted task fields. Founders can update tasks in their organization; Site Engineers can update tasks assigned to them.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               progressUnitId:
 *                 type: string
 *               totalQuantity:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Invalid task data
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateUpdateTask,
    handleTaskValidationErrors,
    updateTask
);


/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Permanently delete a task
 *     description: Permanently deletes a task and its related progress records, issues, activity history and S3 attachments.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *     responses:
 *       200:
 *         description: Task and related records permanently deleted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Deletion access denied
 *       404:
 *         description: Task not found
 *       502:
 *         description: S3 attachment deletion failed
 *       500:
 *         description: Server error
 */
router.delete(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateTaskId,
    handleTaskValidationErrors,
    deleteTask
);


/**
 * @swagger
 * /tasks/{id}/assignees:
 *   post:
 *     summary: Add Site Engineers to a task
 *     description: Adds active Site Engineers who are already assigned to the task's project. Founders and assigned Site Engineers can add members.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "64f123456789abcdef123456"
 *     responses:
 *       200:
 *         description: Task assignees added successfully
 *       400:
 *         description: Invalid user IDs or ineligible assignees
 *       403:
 *         description: Assignment permission denied
 *       404:
 *         description: Task or project not found
 *       500:
 *         description: Server error
 */
router.post(
    "/:id/assignees",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateAddTaskAssignees,
    handleTaskValidationErrors,
    addTaskAssignees
);

/**
 * @swagger
 * /tasks/{id}/assignees:
 *   delete:
 *     summary: Remove a Site Engineer from a task
 *     description: Allows the Founder to remove an assigned Site Engineer from a task. The Site Engineer remains assigned to the parent project.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Site Engineer ID to remove
 *     responses:
 *       200:
 *         description: Site Engineer removed successfully
 *       403:
 *         description: Only the Founder can remove assignees
 *       404:
 *         description: Task or assignee not found
 *       500:
 *         description: Server error
 */
router.delete(
    "/:id/assignees",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateRemoveTaskAssignee,
    handleTaskValidationErrors,
    removeTaskAssignee
);

/**
 * @swagger
 * /tasks/{id}/progress:
 *   post:
 *     summary: Record task progress
 *     description: Records additional completed quantity, updates cumulative task progress and automatically completes the task when its total quantity is reached.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - completedQuantity
 *             properties:
 *               completedQuantity:
 *                 type: number
 *                 example: 25
 *               description:
 *                 type: string
 *                 example: Completed 25 units of foundation excavation.
 *     responses:
 *       201:
 *         description: Task progress recorded successfully
 *       400:
 *         description: Invalid quantity or task already completed
 *       403:
 *         description: Task access denied
 *       404:
 *         description: Task not found
 *       409:
 *         description: Concurrent progress update conflict
 *       500:
 *         description: Server error
 */
router.post(
    "/:id/progress",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateCreateTaskProgress,
    handleTaskProgressValidationErrors,
    createTaskProgress
);


/**
 * @swagger
 * /tasks/{id}/progress:
 *   get:
 *     summary: Get task progress history
 *     description: Retrieves paginated progress updates for a task, newest first. Only users with task access can view the history.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Progress history retrieved successfully
 *       403:
 *         description: Task access denied
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get(
    "/:id/progress",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateGetTaskProgress,
    handleTaskProgressValidationErrors,
    getTaskProgress
);


/**
 * @swagger
 * /tasks/{id}/progress/{progressId}/attachments:
 *   post:
 *     summary: Upload progress photos
 *     description: Uploads JPG, PNG or WEBP photos to private AWS S3 storage and attaches them to an existing progress record. Maximum 10 images, 5 MB each.
 *     tags: [Task Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB task ID
 *       - in: path
 *         name: progressId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB progress record ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Up to 10 JPG, PNG or WEBP images, 5 MB each
 *     responses:
 *       201:
 *         description: Progress photos uploaded successfully
 *       400:
 *         description: No images provided or invalid file
 *       403:
 *         description: Task access denied
 *       404:
 *         description: Task or progress record not found
 *       502:
 *         description: S3 upload failed
 *       500:
 *         description: Server error
 */
router.post(
    "/:id/progress/:progressId/attachments",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    upload.array("images", 10),
    uploadTaskProgressAttachments
);

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   post:
 *     summary: Upload photos directly to a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *     responses:
 *       201:
 *         description: Task photos uploaded successfully
 *       400:
 *         description: Invalid request or no images selected
 *       403:
 *         description: Unauthorized task access
 *       404:
 *         description: Task not found
 */
router.post(
    "/:id/attachments",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    upload.array("images", 10),
    uploadTaskAttachments
);

/**
 * @swagger
 * /tasks/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Remove an individual task photo
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Task photo removed successfully
 *       403:
 *         description: Unauthorized task access
 *       404:
 *         description: Task or attachment not found
 */
router.delete(
    "/:id/attachments/:attachmentId",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    removeTaskAttachment
);

/**
 * @swagger
 * /tasks/{id}/issues:
 *   post:
 *     summary: Create an issue for a task
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - assignedTo
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               assignedTo:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Task issue created successfully
 *       400:
 *         description: Validation failed or invalid assignee
 *       403:
 *         description: Unauthorized task access
 *       404:
 *         description: Task not found
 */
router.post(
    "/:id/issues",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateCreateTaskIssue,
    handleTaskIssueValidationErrors,
    createTaskIssue
);

/**
 * @swagger
 * /tasks/{id}/issues:
 *   get:
 *     summary: Get all issues for a task
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search issue title or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Task issues retrieved successfully
 *       403:
 *         description: Unauthorized task access
 *       404:
 *         description: Task not found
 */
router.get(
    "/:id/issues",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateGetTaskIssues,
    handleTaskIssueValidationErrors,
    getTaskIssues
);

/**
 * @swagger
 * /tasks/{id}/issues/{issueId}:
 *   get:
 *     summary: Get a single task issue
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue ID
 *     responses:
 *       200:
 *         description: Issue retrieved successfully
 *       400:
 *         description: Invalid task or issue ID
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task or issue not found
 */
router.get(
    "/:id/issues/:issueId",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateTaskIssueParams,
    handleTaskIssueValidationErrors,
    getTaskIssueById
);

/**
 * @swagger
 * /tasks/{id}/issues/{issueId}:
 *   patch:
 *     summary: Update task issue details
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Issue updated successfully
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task or issue not found
 */
router.patch(
    "/:id/issues/:issueId",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateUpdateTaskIssue,
    handleTaskIssueValidationErrors,
    updateTaskIssue
);

/**
 * @swagger
 * /tasks/{id}/issues/{issueId}/assign:
 *   patch:
 *     summary: Reassign a task issue to another Site Engineer
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: ID of the new Site Engineer
 *     responses:
 *       200:
 *         description: Issue reassigned successfully
 *       400:
 *         description: Invalid assignment or validation failed
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task, issue, or Site Engineer not found
 */
router.patch(
    "/:id/issues/:issueId/assign",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateReassignTaskIssue,
    handleTaskIssueValidationErrors,
    reassignTaskIssue
);

/**
 * @swagger
 * /tasks/{id}/issues/{issueId}/status:
 *   patch:
 *     summary: Update task issue status
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - Open
 *                   - In Progress
 *                   - Resolved
 *                   - Closed
 *     responses:
 *       200:
 *         description: Issue status updated successfully
 *       400:
 *         description: Invalid status or issue already has this status
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task or issue not found
 */
router.patch(
    "/:id/issues/:issueId/status",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateUpdateTaskIssueStatus,
    handleTaskIssueValidationErrors,
    updateTaskIssueStatus
);


/**
 * @swagger
 * /tasks/{id}/issues/{issueId}/attachments:
 *   post:
 *     summary: Upload attachments to a task issue
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: JPG, PNG or WEBP images (maximum 10 files, 5 MB each)
 *     responses:
 *       201:
 *         description: Issue attachments uploaded successfully
 *       400:
 *         description: Invalid request or no images provided
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task or issue not found
 *       502:
 *         description: S3 upload failed
 */
router.post(
    "/:id/issues/:issueId/attachments",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateTaskIssueParams,
    handleTaskIssueValidationErrors,
    upload.array("images", 10),
    uploadTaskIssueAttachments
);


/**
 * @swagger
 * /tasks/{id}/issues/{issueId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Remove an issue attachment
 *     tags: [Task Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue ID
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Issue attachment removed successfully
 *       400:
 *         description: Invalid IDs
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task, issue, or attachment not found
 *       500:
 *         description: Failed to remove attachment
 */
router.delete(
    "/:id/issues/:issueId/attachments/:attachmentId",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateRemoveTaskIssueAttachment,
    handleTaskIssueValidationErrors,
    removeTaskIssueAttachment
);


/**
 * @swagger
 * /tasks/{id}/activity:
 *   get:
 *     summary: Get task activity timeline
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Task activity retrieved successfully
 *       400:
 *         description: Invalid task ID or pagination parameters
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
router.get(
    "/:id/activity",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateGetTaskActivity,
    handleTaskValidationErrors,
    getTaskActivity
);



module.exports = router;
