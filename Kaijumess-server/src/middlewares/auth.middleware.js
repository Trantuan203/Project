const jwt = require('jsonwebtoken');
const userSessionModel = require('../models/user-session.model');

const verifyToken = (token) => {
    if (!process.env.JWT_SECRET) {
        const error = new Error('Missing JWT_SECRET in environment.');
        error.code = 'MISSING_JWT_SECRET';
        error.statusCode = 500;
        throw error;
    }

    return jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
    });
};

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
        }

        const payload = verifyToken(token);

        if (payload.sid) {
            let session;

            try {
                session = await userSessionModel.findActiveSessionById(payload.sid);
            } catch (error) {
                if (error?.code === '42P01') {
                    return res.status(503).json({
                        code: 'SESSION_STORAGE_NOT_READY',
                        message: 'Database session storage is not ready. Apply 003_account_sessions.sql first.',
                    });
                }

                throw error;
            }

            if (!session || session.user_id !== payload.sub) {
                return res.status(401).json({ message: 'Session has been revoked or is no longer active.' });
            }

            try {
                await userSessionModel.touchSession(payload.sid);
            } catch (error) {
                if (error?.code === '42P01') {
                    return res.status(503).json({
                        code: 'SESSION_STORAGE_NOT_READY',
                        message: 'Database session storage is not ready. Apply 003_account_sessions.sql first.',
                    });
                }

                throw error;
            }
            req.session = session;
        } else {
            req.session = null;
        }

        req.user = payload;

        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;
module.exports.verifyToken = verifyToken;
