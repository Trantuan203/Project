const express = require('express');
const cors = require('cors');
const accountRoutes = require('./routes/account.route');
const authRoutes = require('./routes/auth.route');
const messageRoutes = require('./routes/message.route');
const roomRoutes = require('./routes/room.route');
const settingsRoutes = require('./routes/settings.route');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origin not allowed by CORS.'));
    },
}));
app.use(express.json({ limit: '40mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);

module.exports = app;
