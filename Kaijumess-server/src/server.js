require('dotenv').config();
const http = require('http');
const app = require('./app');
const pool = require('./config/db');
const initSocket = require('./socket');

const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connected!');

        const server = http.createServer(app);
        const io = await initSocket(server);
        app.set('io', io);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Startup error:', err);
        process.exit(1);
    }
};

start();
