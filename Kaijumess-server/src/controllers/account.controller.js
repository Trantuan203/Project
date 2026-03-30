const accountService = require('../services/account.service');

const updateProfile = async (req, res) => {
    try {
        const user = await accountService.updateProfile(req.user.sub, req.body);
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const listSessions = async (req, res) => {
    try {
        const sessions = await accountService.listSessions(req.user.sub, req.user.sid);
        return res.status(200).json({ sessions });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const revokeSession = async (req, res) => {
    try {
        const result = await accountService.revokeSession(
            req.user.sub,
            req.params.sessionId,
            req.user.sid
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const getNotificationCenter = async (req, res) => {
    try {
        const center = await accountService.listNotificationCenter(req.user.sub);
        return res.status(200).json(center);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        await accountService.markNotificationRead(req.user.sub, decodeURIComponent(req.params.notificationKey));
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        await accountService.markAllNotificationsRead(req.user.sub);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const respondToFriendInvitation = async (req, res) => {
    try {
        const result = await accountService.respondToFriendInvitation(
            req.user.sub,
            req.params.friendshipId,
            req.body?.action,
        );
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

module.exports = {
    getNotificationCenter,
    listSessions,
    markAllNotificationsRead,
    markNotificationRead,
    respondToFriendInvitation,
    revokeSession,
    updateProfile,
};
