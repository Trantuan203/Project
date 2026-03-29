const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const messageController = require('../controllers/message.controller');

const router = express.Router();

router.get('/:conversationId', authMiddleware, messageController.listMessages);
router.post('/:conversationId', authMiddleware, messageController.createMessage);

module.exports = router;
