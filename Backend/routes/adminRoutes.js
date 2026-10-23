const express = require("express");
const router = express.Router();

const { adminLogin } = require("../controllers//adminController");

/**
 * @openapi
 * /admin/login:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Sign in as an administrator
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Admin signed in.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: admin
 *                 name:
 *                   type: string
 *       "401":
 *         description: Invalid admin credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post("/login", adminLogin);

module.exports = router;