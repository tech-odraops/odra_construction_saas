const express = require("express");
const router = express.Router();

const { authen } = require("../middleware/tokenValidatorsMiddleware");
const notificationController = require("../controllers/notificationController");

/**
 * @openapi
 * /notification/fcm-token:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Save the authenticated user's Firebase Cloud Messaging token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *     responses:
 *       "200":
 *         description: FCM token saved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: FCM token is missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
    "/fcm-token",
    authen,
    notificationController.saveFCMToken
);

module.exports = router;