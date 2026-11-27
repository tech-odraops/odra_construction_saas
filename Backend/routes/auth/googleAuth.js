const express = require('express');
const googleAuth = express.Router();
const { googleAuthHandler } = require("../../controllers/googleAuthController");    

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Authenticate an existing account through Google OAuth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Google authorization code
 *               origin:
 *                 type: string
 *                 format: uri
 *                 description: Optional redirect URI
 *     responses:
 *       "200":
 *         description: Authentication result; a missing local user returns success false
 *           and redirect /Signup. On success the JWT is set as an HTTP-only cookie.
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only authentication cookie containing the JWT.
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *               properties:
 *                 success:
 *                   type: boolean
 *                 User_id:
 *                   type: string
 *                 role:
 *                   type: string
 *                 name:
 *                   type: string
 *                 redirect:
 *                   type: string
 *                 error:
 *                   type: string
 *       "400":
 *         description: Authorization code missing or Google token invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
googleAuth.post('/google', googleAuthHandler);
module.exports = {googleAuth};
