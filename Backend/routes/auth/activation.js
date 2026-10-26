
const express = require("express");
const router = express.Router();

const activationController = require("../../controllers/activationController");

/**
 * @openapi
 * /auth/activate-account:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Activate an invited account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: At least one letter and one number; spaces are not allowed.
 *     responses:
 *       "200":
 *         description: Account activated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Missing or invalid fields, or invitation invalid, expired, or
 *           already used.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/activate-account", activationController.activateAccount);

module.exports = { activation: router };
