const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('Missing DATABASE_URL. Add it to your .env file.');
}

let ssl = false;

try {
    const { hostname } = new URL(connectionString);
    const isLocalDatabase =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1';

    ssl = isLocalDatabase ? false : { rejectUnauthorized: false };
} catch (error) {
    throw new Error('DATABASE_URL is not a valid connection string.');
}

const pool = new Pool({
    connectionString,
    ssl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ DB Pool error:', err);
});

module.exports = pool;
