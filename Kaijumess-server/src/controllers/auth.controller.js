const authService = require('../services/auth.service');

const getSessionContext = (req) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || '',
    userAgent: req.get('user-agent') || '',
});

const register = async (req, res) => {
    try {
        const result = await authService.register(req.body, getSessionContext(req));
        return res.status(201).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const login = async (req, res) => {
    try {
        const result = await authService.login(req.body, getSessionContext(req));
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const me = async (req, res) => {
    try {
        const user = await authService.getCurrentUser(req.user.sub);
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const result = await authService.changePassword(req.user.sub, req.body);
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
    changePassword,
    login,
    me,
    register,
};
