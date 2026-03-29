const settingsService = require('../services/settings.service');

const getCurrentSettings = async (req, res) => {
    try {
        const preferences = await settingsService.getCurrentSettings(req.user.sub);
        return res.status(200).json({ preferences });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const updateSettingsSection = async (req, res) => {
    try {
        const preferences = await settingsService.updateSettingsSection(
            req.user.sub,
            req.params.section,
            req.body?.value
        );

        return res.status(200).json({
            preferences,
            section: req.params.section,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

module.exports = {
    getCurrentSettings,
    updateSettingsSection,
};
