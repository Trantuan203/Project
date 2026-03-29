const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'Missing JWT_SECRET in environment.' });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });
        req.user = payload;

        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;
