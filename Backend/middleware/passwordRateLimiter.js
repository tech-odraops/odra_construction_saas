
const rateLimit = require("express-rate-limit");

const passwordRecoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Maximum 5 requests per IP per window
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many password recovery requests. Please try again later."
    }
});

module.exports = {
    passwordRecoveryLimiter
};
