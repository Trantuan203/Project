const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

router.get('/', authMiddleware, settingsController.getCurrentSettings);
router.put('/:section', authMiddleware, settingsController.updateSettingsSection);

module.exports = router;
