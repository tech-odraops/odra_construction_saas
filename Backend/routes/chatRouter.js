const express = require('express');
const chatRouter = express.Router();
const {getProjectChats, getUnreadCount, markChatRead} = require('../controllers/getProjectChats');
const {authen} = require('../middleware/tokenValidatorsMiddleware');
const {validateRoles} = require('../middleware/roles');

/**
 * @openapi
 * /chat/{projectId}:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get project chat messages
 *     description: Manager or site engineer. Messages are returned in chronological
 *       order within the selected page.
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Zero-based page index.
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *       - name: limit
 *         in: query
 *         description: Number of messages per page.
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *     responses:
 *       "200":
 *         description: Chat messages.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chats:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ChatMessage"
 *                 message:
 *                   type: string
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
chatRouter.get('/:projectId',authen,validateRoles(["Founder", "Site Engineer"]),getProjectChats);
/**
 * @openapi
 * /chat/{projectId}/unread:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get unread chat message count
 *     description: Manager or site engineer.
 *     responses:
 *       "200":
 *         description: Unread count.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 message:
 *                   type: string
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
chatRouter.get('/:projectId/unread',authen,validateRoles(["Founder", "Site Engineer"]),getUnreadCount);
/**
 * @openapi
 * /chat/{projectId}/read:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Mark other participants' project messages as read
 *     description: Manager or site engineer. Request body is not used.
 *     responses:
 *       "200":
 *         description: Messages marked read.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
chatRouter.post('/:projectId/read',authen,validateRoles(["Founder", "Site Engineer"]),markChatRead);

module.exports = chatRouter;
