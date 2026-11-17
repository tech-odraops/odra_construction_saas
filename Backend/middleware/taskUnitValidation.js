
const { body, param, validationResult } = require("express-validator");

// Validate Task Unit creation
exports.validateCreateTaskUnit = [
    body("name")
        .isString()
        .withMessage("Unit name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Unit name is required")
        .bail()
        .isLength({ max: 100 })
        .withMessage("Unit name cannot exceed 100 characters"),

    body("abbreviation")
        .isString()
        .withMessage("Unit abbreviation must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Unit abbreviation is required")
        .bail()
        .isLength({ max: 20 })
        .withMessage("Unit abbreviation cannot exceed 20 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters")
];

// Validate Task Unit updates
exports.validateUpdateTaskUnit = [
    param("id")
        .isMongoId()
        .withMessage("Invalid unit ID"),

    body("name")
        .optional()
        .isString()
        .withMessage("Unit name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Unit name cannot be empty")
        .bail()
        .isLength({ max: 100 })
        .withMessage("Unit name cannot exceed 100 characters"),

    body("abbreviation")
        .optional()
        .isString()
        .withMessage("Unit abbreviation must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Unit abbreviation cannot be empty")
        .bail()
        .isLength({ max: 20 })
        .withMessage("Unit abbreviation cannot exceed 20 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .bail()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),

    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false")
        .toBoolean()
];

// Validate Task Unit ID
exports.validateTaskUnitId = [
    param("id")
        .isMongoId()
        .withMessage("Invalid unit ID")
];

// Handle validation errors
exports.handleTaskUnitValidationErrors = (req, res, next) => {
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
