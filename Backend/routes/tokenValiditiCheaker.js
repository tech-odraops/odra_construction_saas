const express = require('express');
const tokenValidation = express.Router();
const {authen} = require('../middleware/tokenValidatorsMiddleware');
const {tokenHandler} = require('../controllers/tokenValidatorHandler');


/**
 * @openapi
 * /token/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Validate the current session cookie and return the signed-in user
 *     responses:
 *       "200":
 *         description: Token is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token is valid
 *                 role:
 *                   type: string
 *                 User_id:
 *                   type: string
 *                 organizationId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 */
tokenValidation.get('/me',authen,tokenHandler);
module.exports = tokenValidation;