require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const migrationsDir = path.join(__dirname, '..', 'database');

const run = async () => {
    const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));

    if (!files.length) {
        console.log('No SQL migrations found.');
        return;
    }

    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        console.log(`Running migration ${file}...`);
        await pool.query(sql);
    }

    console.log('All SQL migrations completed successfully.');
};

run()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
