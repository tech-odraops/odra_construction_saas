const express = require('express');
const { clearAuthCookie } = require('../../utils/authCookie');

const logout = express.Router();

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Log out and clear the authentication cookie
 *     description: >
 *       Clears the HTTP-only authentication cookie. Works without a valid
 *       session so that an expired cookie can always be removed.
 *     security: []
 *     responses:
 *       '200':
 *         description: Logged out.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Logged out successfully }
 */
logout.post('/logout', (req, res) => {
    clearAuthCookie(res);
    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
});

module.exports = { logout };
