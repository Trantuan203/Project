const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roomController = require('../controllers/room.controller');

const router = express.Router();

router.get('/', authMiddleware, roomController.listRooms);
router.get('/calls', authMiddleware, roomController.listCalls);
router.get('/friends', authMiddleware, roomController.listFriends);
router.get('/friend-requests', authMiddleware, roomController.listPendingFriendRequests);
router.get('/search-users', authMiddleware, roomController.searchUsers);
router.post('/direct', authMiddleware, roomController.createDirectRoom);
router.post('/friend-requests', authMiddleware, roomController.createFriendRequest);
router.patch('/:conversationId/wallpaper', authMiddleware, roomController.updateConversationWallpaper);
router.patch('/:conversationId/participants/:targetUserId/nickname', authMiddleware, roomController.updateParticipantNickname);

module.exports = router;
