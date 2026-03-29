require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await pool.query('SELECT 1'); // test kết nối
        console.log('✅ Database connected!');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Cannot connect to database:', err);
        process.exit(1);
    }
};

start();