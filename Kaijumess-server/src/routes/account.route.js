const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../controllers/account.controller');

const router = express.Router();

router.patch('/profile', authMiddleware, accountController.updateProfile);
router.get('/sessions', authMiddleware, accountController.listSessions);
router.delete('/sessions/:sessionId', authMiddleware, accountController.revokeSession);

module.exports = router;
