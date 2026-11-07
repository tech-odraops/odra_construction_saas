
const { body, validationResult } = require("express-validator");

// Site Engineer personal profile validation
exports.validatePersonalProfile = [
    body("name")
        .optional({ values: "undefined" })
        .isString()
        .withMessage("Name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty"),

    body("email")
        .optional({ values: "undefined" })
        .isString()
        .withMessage("Email must be a string")
        .bail()
        .trim()
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("phoneNumber")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Phone number must be a string")
        .bail()
        .trim()
        .isMobilePhone("any", { strictMode: false })
        .withMessage("Please provide a valid phone number")
];

// Organization profile validation
exports.validateOrganizationProfile = [
    body("name")
        .optional({ values: "undefined" })
        .isString()
        .withMessage("Organization name must be a string")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("Organization name cannot be empty")
];

// Common validation error handler
exports.handleValidationErrors = (req, res, next) => {
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
