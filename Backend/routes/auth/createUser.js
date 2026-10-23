const express = require('express')
const { validationResult, body } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('../../models/user');
const User = require('../../models/user');
const env = require('dotenv').config();
const Organization = require("../../models/Organization");

// signin
const signin = express.Router()

/**
 * @openapi
 * /auth/signIn:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       '200':
 *         description: Signed in. The JWT expires after one hour.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, token, User_id, role, name, organizationId]
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token: { type: string }
 *                 User_id: { type: string }
 *                 role: { type: string }
 *                 name: { type: string }
 *                 organizationId: { type: string }
 *       '401':
 *         description: Email does not exist or password is incorrect.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Account is inactive, role is not permitted, or organization is missing or inactive.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '422':
 *         description: Request validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       '500':
 *         $ref: '#/components/responses/InternalServerError'
 */
signin.post(
    "/signIn",
    [
        body("email")
            .isEmail()
            .withMessage("Enter a valid email"),
        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({
                success: false,
                error: errors.array()
            });
        }

        try {
            const email = req.body.email.trim().toLowerCase();
            const { password } = req.body;

            const response = await User.findOne({ email });

            // Use the same response for unknown users and invalid credentials.
            if (!response) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid email or password."
                });
            }

            const isMatchPassword = await bcrypt.compare(
                password,
                response.password
            );

            if (!isMatchPassword) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid email or password."
                });
            }

            // Only activated accounts may sign in.
            if (response.status !== "active") {
                return res.status(403).json({
                    success: false,
                    error: "Your account is not active. Please contact your organization administrator."
                });
            }

            const allowedRoles = [
                "Founder",
                "Site Supervisor",
                "Site Engineer"
            ];

            if (!allowedRoles.includes(response.role)) {
                return res.status(403).json({
                    success: false,
                    error: "This account role is not permitted to sign in here."
                });
            }

            if (!response.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: "This account is not associated with an organization."
                });
            }

            const organization = await Organization.findById(
                response.organizationId
            );

            if (!organization || organization.status !== "active") {
                return res.status(403).json({
                    success: false,
                    error: "This organization is not active."
                });
            }

            const token = jwt.sign(
                {
                    User_id: response._id,
                    isLoggedIn: true,
                    role: response.role,
                    organizationId: organization._id
                },
                process.env.secret_key,
                { expiresIn: "1h" }
            );

            return res.status(200).json({
                success: true,
                token,
                User_id: response._id,
                role: response.role,
                name: response.name,
                organizationId: organization._id
            });
        } catch (error) {
            console.error("Sign-in error:", error.message);

            return res.status(500).json({
                success: false,
                error: "Internal Server Error"
            });
        }
    }
);
module.exports = { signin }
