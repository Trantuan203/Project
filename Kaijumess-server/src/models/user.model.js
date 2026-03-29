const pool = require('../config/db');

const publicUserColumns = `
    id,
    username,
    email,
    full_name,
    display_name,
    avatar_url,
    status,
    last_seen,
    created_at
`;

const findByIdentifier = async (identifier) => {
    const query = `
        SELECT id, username, email, full_name, display_name, password_hash, avatar_url, status, last_seen, created_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
           OR LOWER(username) = LOWER($1)
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [identifier]);
    return rows[0] || null;
};

const findByEmail = async (email) => {
    const query = `
        SELECT id, username, email, full_name, display_name, password_hash, avatar_url, status, last_seen, created_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
};

const findByUsername = async (username) => {
    const query = `
        SELECT id, username, email, full_name, display_name, password_hash, avatar_url, status, last_seen, created_at
        FROM users
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [username]);
    return rows[0] || null;
};

const findPublicById = async (id) => {
    const query = `
        SELECT ${publicUserColumns}
        FROM users
        WHERE id = $1
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

const createUser = async ({ username, email, fullName, displayName, passwordHash }) => {
    const query = `
        INSERT INTO users (username, email, full_name, display_name, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${publicUserColumns}
    `;

    const values = [username, email, fullName, displayName, passwordHash];
    const { rows } = await pool.query(query, values);

    return rows[0];
};

module.exports = {
    createUser,
    findByEmail,
    findByIdentifier,
    findByUsername,
    findPublicById,
};
