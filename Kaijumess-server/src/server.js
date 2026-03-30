require('dotenv').config();
const http = require('http');
const app = require('./app');
const pool = require('./config/db');
const initSocket = require('./socket');

const PORT = process.env.PORT || 3000;
const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 20);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 3000);

const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const connectDatabaseWithRetry = async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= DB_CONNECT_RETRIES; attempt += 1) {
        try {
            await pool.query('SELECT 1');
            console.log('✅ Database connected!');
            return;
        } catch (error) {
            lastError = error;
            console.error(
                `⚠️ Database connection attempt ${attempt}/${DB_CONNECT_RETRIES} failed:`,
                error.message || error,
            );

            if (attempt < DB_CONNECT_RETRIES) {
                await wait(DB_CONNECT_RETRY_DELAY_MS);
            }
        }
    }

    throw lastError;
};

const start = async () => {
    try {
        await connectDatabaseWithRetry();

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
