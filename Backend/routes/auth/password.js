const { passwordRecoveryLimiter } = require("../../middleware/passwordRateLimiter");
const express = require("express");
const router = express.Router();

const passwordController = require("../../controllers/passwordController");
const { authen } = require("../../middleware/tokenValidatorsMiddleware");

router.patch("/change-password", authen, passwordController.changePassword);

router.post(
    "/forgot-password",
    passwordRecoveryLimiter,
    passwordController.forgotPassword
);

router.post(
    "/reset-password",
    passwordRecoveryLimiter,
    passwordController.resetPassword
);
module.exports = { password: router };
