const authService = require('../services/auth.service');

const register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
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
        const result = await authService.login(req.body);
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

module.exports = {
    login,
    me,
    register,
};
