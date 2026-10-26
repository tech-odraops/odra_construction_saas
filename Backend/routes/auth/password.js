const { passwordRecoveryLimiter } = require("../../middleware/passwordRateLimiter");
const express = require("express");
const router = express.Router();

const passwordController = require("../../controllers/passwordController");
const { authen } = require("../../middleware/tokenValidatorsMiddleware");

/**
 * @openapi
 * /auth/change-password:
 *   patch:
 *     tags:
 *       - Authentication
 *     summary: Change the authenticated user's password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: At least one letter and one number; spaces are not allowed.
 *     responses:
 *       "200":
 *         description: Password changed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Invalid current or new password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "401":
 *         description: Authentication missing or active account not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.patch("/change-password", authen, passwordController.changePassword);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset instructions
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       "200":
 *         description: Generic response returned whether or not the account exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Email is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
    "/forgot-password",
    passwordRecoveryLimiter,
    passwordController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password using a reset token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: At least one letter and one number; spaces are not allowed.
 *     responses:
 *       "200":
 *         description: Password reset.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Invalid input, or reset token invalid, expired, or already used.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
    "/reset-password",
    passwordRecoveryLimiter,
    passwordController.resetPassword
);
module.exports = { password: router };
