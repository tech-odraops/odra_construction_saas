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
