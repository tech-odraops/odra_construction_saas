const express = require('express');
const chatRouter = express.Router();
const {getProjectChats, getUnreadCount, markChatRead} = require('../controllers/getProjectChats');
const {authen} = require('../middleware/tokenValidatorsMiddleware');
const {validateRoles} = require('../middleware/roles');

chatRouter.get('/:projectId',authen,validateRoles(["Founder", "Site Engineer"]),getProjectChats);
chatRouter.get('/:projectId/unread',authen,validateRoles(["Founder", "Site Engineer"]),getUnreadCount);
chatRouter.post('/:projectId/read',authen,validateRoles(["Founder", "Site Engineer"]),markChatRead);

module.exports = chatRouter;
