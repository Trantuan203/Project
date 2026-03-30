const getAllowedOrigins = () =>
    (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

module.exports = {
    getAllowedOrigins,
};
