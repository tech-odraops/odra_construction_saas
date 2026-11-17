
const { body, param, validationResult } = require("express-validator");

// Validate category creation
exports.validateCreateTaskCategory = [
    body("name")
        .isString()
        .withMessage("Category name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .bail()
        .isLength({ max: 100 })
        .withMessage("Category name cannot exceed 100 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),

    body("icon")
        .optional({ nullable: true })
        .isString()
        .withMessage("Icon must be a string")
        .bail()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Icon cannot exceed 100 characters")
];

// Validate category updates
exports.validateUpdateTaskCategory = [
    param("id")
        .isMongoId()
        .withMessage("Invalid category ID"),

    body("name")
        .optional()
        .isString()
        .withMessage("Category name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Category name cannot be empty")
        .bail()
        .isLength({ max: 100 })
        .withMessage("Category name cannot exceed 100 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),

    body("icon")
        .optional({ nullable: true })
        .isString()
        .withMessage("Icon must be a string")
        .bail()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Icon cannot exceed 100 characters"),

    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false")
        .toBoolean()
];

// Validate category ID in route parameters
exports.validateTaskCategoryId = [
    param("id")
        .isMongoId()
        .withMessage("Invalid category ID")
];

// Common validation error handler
exports.handleTaskCategoryValidationErrors = (req, res, next) => {
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
