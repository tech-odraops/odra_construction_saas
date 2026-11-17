
const {
    body,
    param,
    query,
    validationResult
} = require("express-validator");

// Validate issue creation
exports.validateCreateTaskIssue = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Issue title is required.")
        .bail()
        .isString()
        .withMessage("Issue title must be a string.")
        .bail()
        .isLength({ max: 200 })
        .withMessage("Issue title cannot exceed 200 characters."),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string.")
        .bail()
        .isLength({ max: 3000 })
        .withMessage("Description cannot exceed 3000 characters.")
        .trim(),

    body("dueDate")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("Due date must be a valid date.")
        .toDate(),

    body("assignedTo")
        .notEmpty()
        .withMessage("Assigned Site Engineer is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid assigned Site Engineer ID."),

    body("tags")
        .optional()
        .isArray({ max: 20 })
        .withMessage("Tags must be an array with at most 20 items."),

    body("tags.*")
        .optional()
        .isString()
        .withMessage("Each tag must be a string.")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Tags cannot contain empty values.")
        .bail()
        .isLength({ max: 50 })
        .withMessage("Each tag cannot exceed 50 characters.")
];

// Validate issue ID
exports.validateTaskIssueId = [
    param("issueId")
        .isMongoId()
        .withMessage("Invalid issue ID.")
];

// Validate issue listing
exports.validateGetTaskIssues = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    query("search")
        .optional()
        .isString()
        .withMessage("Search must be a string.")
        .bail()
        .isLength({ max: 150 })
        .withMessage("Search cannot exceed 150 characters."),

    query("status")
        .optional()
        .isIn(["Open", "In Progress", "Resolved", "Closed"])
        .withMessage("Invalid issue status."),

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

exports.validateTaskIssueParams = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    param("issueId")
        .isMongoId()
        .withMessage("Invalid issue ID.")
];

// Return validation errors
exports.handleTaskIssueValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed.",
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }

    next();
};

// validate Update TaskIssue
exports.validateUpdateTaskIssue = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    param("issueId")
        .isMongoId()
        .withMessage("Invalid issue ID."),

    body("title")
        .optional()
        .isString()
        .withMessage("Issue title must be a string.")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Issue title cannot be empty.")
        .bail()
        .isLength({ max: 200 })
        .withMessage("Issue title cannot exceed 200 characters."),

    body("description")
        .optional({ nullable: true })
        .isString()
        .withMessage("Description must be a string.")
        .bail()
        .isLength({ max: 3000 })
        .withMessage("Description cannot exceed 3000 characters.")
        .trim(),

    body("dueDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("Due date must be a valid date.")
        .toDate(),

    body("tags")
        .optional()
        .isArray({ max: 20 })
        .withMessage("Tags must be an array with at most 20 items."),

    body("tags.*")
        .optional()
        .isString()
        .withMessage("Each tag must be a string.")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Tags cannot contain empty values.")
        .bail()
        .isLength({ max: 50 })
        .withMessage("Each tag cannot exceed 50 characters.")
];

// validate Reassign TaskIssue
exports.validateReassignTaskIssue = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    param("issueId")
        .isMongoId()
        .withMessage("Invalid issue ID."),

    body("assignedTo")
        .notEmpty()
        .withMessage("Assigned Site Engineer ID is required.")
        .bail()
        .isMongoId()
        .withMessage("Invalid Site Engineer ID.")
];

// validate Update TaskIssueStatus 
exports.validateUpdateTaskIssueStatus = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    param("issueId")
        .isMongoId()
        .withMessage("Invalid issue ID."),

    body("status")
        .notEmpty()
        .withMessage("Issue status is required.")
        .bail()
        .isIn(["Open", "In Progress", "Resolved", "Closed"])
        .withMessage("Invalid issue status. Allowed: Open, In Progress, Resolved, Closed.")
];

// validateRemoveTaskIssueAttachment
exports.validateRemoveTaskIssueAttachment = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID."),

    param("issueId")
        .isMongoId()
        .withMessage("Invalid issue ID."),

    param("attachmentId")
        .isMongoId()
        .withMessage("Invalid attachment ID.")
];
