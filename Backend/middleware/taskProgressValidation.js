
const { body, param, query, validationResult } = require("express-validator");

// Validate creating a task progress update
exports.validateCreateTaskProgress = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID"),

    body("completedQuantity")
        .notEmpty()
        .withMessage("Completed quantity is required")
        .bail()
        .isFloat({ gt: 0 })
        .withMessage("Completed quantity must be greater than zero")
        .toFloat(),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters")
];

exports.validateGetTaskProgress = [
    param("id")
        .isMongoId()
        .withMessage("Invalid task ID"),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt()
];


// Handle task progress validation errors
exports.handleTaskProgressValidationErrors = (req, res, next) => {
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
