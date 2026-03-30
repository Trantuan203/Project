const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../controllers/account.controller');

const router = express.Router();

router.patch('/profile', authMiddleware, accountController.updateProfile);
router.get('/notification-center', authMiddleware, accountController.getNotificationCenter);
router.post('/notifications/read-all', authMiddleware, accountController.markAllNotificationsRead);
router.patch('/notifications/:notificationKey/read', authMiddleware, accountController.markNotificationRead);
router.patch('/friend-invitations/:friendshipId', authMiddleware, accountController.respondToFriendInvitation);
router.get('/sessions', authMiddleware, accountController.listSessions);
router.delete('/sessions/:sessionId', authMiddleware, accountController.revokeSession);

module.exports = router;
