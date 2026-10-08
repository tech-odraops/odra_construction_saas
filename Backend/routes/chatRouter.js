const express = require('express');
const chatRouter = express.Router();
const {getProjectChats, getUnreadCount, markChatRead} = require('../controllers/getProjectChats');
const {authen} = require('../middleware/tokenValidatorsMiddleware');
const {validateRoles} = require('../middleware/roles');

chatRouter.get('/:projectId',authen,validateRoles(["manager","site engineer"]),getProjectChats);
chatRouter.get('/:projectId/unread',authen,validateRoles(["manager","site engineer"]),getUnreadCount);
chatRouter.post('/:projectId/read',authen,validateRoles(["manager","site engineer"]),markChatRead);

module.exports = chatRouter;
