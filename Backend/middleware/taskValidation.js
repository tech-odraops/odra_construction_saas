
const { body, param, query, validationResult } = require("express-validator");

// Validate task creation
exports.validateCreateTask = [
    body("title")
        .isString()
        .withMessage("Task title must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Task title is required")
        .bail()
        .isLength({ max: 150 })
        .withMessage("Task title cannot exceed 150 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters"),

    body("projectId")
        .isMongoId()
        .withMessage("Valid project ID is required"),

    body("categoryId")
        .isMongoId()
        .withMessage("Valid category ID is required"),

    body("progressUnitId")
        .isMongoId()
        .withMessage("Valid progress unit ID is required"),

    body("totalQuantity")
        .isFloat({ gt: 0 })
        .withMessage("Total quantity must be greater than zero")
        .toFloat(),

    body("startDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("Start date must be a valid date")
        .toDate(),

    body("endDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("End date must be a valid date")
        .toDate(),

    body("endDate")
        .optional({ nullable: true })
        .custom((endDate, { req }) => {
            if (
                endDate &&
                req.body.startDate &&
                new Date(endDate) < new Date(req.body.startDate)
            ) {
                throw new Error("End date cannot be before start date");
            }

            return true;
        }),

    // Optional initial Site Engineer assignments.
    // The controller will verify project membership and role.
    body("assignees")
        .optional()
        .isArray()
        .withMessage("Assignees must be an array"),

    body("assignees.*")
        .optional()
        .isMongoId()
        .withMessage("Every assignee must have a valid user ID")
];


// Validate task updates
exports.validateUpdateTask = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID"),

    body("title")
        .optional()
        .isString()
        .withMessage("Task title must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Task title cannot be empty")
        .bail()
        .isLength({ max: 150 })
        .withMessage("Task title cannot exceed 150 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters"),

    body("categoryId")
        .optional()
        .isMongoId()
        .withMessage("Invalid category ID"),

    body("progressUnitId")
        .optional()
        .isMongoId()
        .withMessage("Invalid progress unit ID"),

    body("totalQuantity")
        .optional()
        .isFloat({ gt: 0 })
        .withMessage("Total quantity must be greater than zero")
        .toFloat(),

    body("startDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("Start date must be a valid date")
        .toDate(),

    body("endDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("End date must be a valid date")
        .toDate(),

    body("endDate")
        .optional({ nullable: true })
        .custom((endDate, { req }) => {
            if (
                endDate &&
                req.body.startDate &&
                new Date(endDate) < new Date(req.body.startDate)
            ) {
                throw new Error("End date cannot be before start date");
            }

            return true;
        })
];


// Validate task ID
exports.validateTaskId = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID")
];

// Validate Get Tasks query parameters
exports.validateGetTasks = [
    query("projectId")
        .isMongoId()
        .withMessage("Valid project ID is required"),

    query("search")
        .optional()
        .trim()
        .isLength({ max: 150 })
        .withMessage("Search cannot exceed 150 characters"),

    query("status")
        .optional()
        .isIn(["Pending", "In Progress", "Completed"])
        .withMessage("Invalid task status"),

    query("categoryId")
        .optional()
        .isMongoId()
        .withMessage("Invalid category ID"),

    query("delayed")
        .optional()
        .isBoolean()
        .withMessage("Delayed must be true or false")
        .toBoolean(),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),

    query("sortBy")
        .optional()
        .isIn(["createdAt", "startDate", "endDate", "title", "taskNumber"])
        .withMessage("Invalid sorting field"),

    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Sort order must be asc or desc")
];

// Handle validation errors
exports.handleTaskValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }

    next();
};

// Validate adding assignees to a task
exports.validateAddTaskAssignees = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID"),

    body("userIds")
        .isArray({ min: 1 })
        .withMessage("At least one user ID is required"),

    body("userIds")
        .custom((userIds) => {
            if (Array.isArray(userIds) &&
                new Set(userIds).size !== userIds.length) {
                throw new Error("Duplicate user IDs are not allowed");
            }

            return true;
        }),

    body("userIds.*")
        .isMongoId()
        .withMessage("Every assignee must have a valid user ID")
];

exports.validateRemoveTaskAssignee = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID"),

    body("userId")
        .isMongoId()
        .withMessage("Valid Site Engineer ID is required")
];

// validate Get TaskActivity
exports.validateGetTaskActivity = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer.")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100.")
        .toInt()
];
