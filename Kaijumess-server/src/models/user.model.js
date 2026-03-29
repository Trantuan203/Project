const pool = require('../config/db');

const publicUserColumns = `
    id,
    username,
    email,
    full_name,
    display_name,
    bio,
    avatar_url,
    status,
    last_seen,
    created_at,
    updated_at,
    preferences
`;

const findByIdentifier = async (identifier) => {
    const query = `
        SELECT id, username, email, full_name, display_name, bio, password_hash, avatar_url, status, last_seen, created_at, updated_at, preferences
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
        SELECT id, username, email, full_name, display_name, bio, password_hash, avatar_url, status, last_seen, created_at, updated_at, preferences
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
};

const findByUsername = async (username) => {
    const query = `
        SELECT id, username, email, full_name, display_name, bio, password_hash, avatar_url, status, last_seen, created_at, updated_at, preferences
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

const findByIdWithPassword = async (id) => {
    const query = `
        SELECT id, username, email, full_name, display_name, bio, password_hash, avatar_url, status, last_seen, created_at, updated_at, preferences
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

const updateAccountProfile = async ({
    avatarUrl,
    bio,
    displayName,
    fullName,
    id,
    preferences,
    username,
}) => {
    const query = `
        UPDATE users
        SET username = $2,
            full_name = $3,
            display_name = $4,
            bio = $5,
            avatar_url = $6,
            preferences = $7::jsonb
        WHERE id = $1
        RETURNING ${publicUserColumns}
    `;

    const { rows } = await pool.query(query, [
        id,
        username,
        fullName,
        displayName,
        bio,
        avatarUrl,
        JSON.stringify(preferences),
    ]);

    return rows[0] || null;
};

const updatePasswordHash = async (id, passwordHash) => {
    const query = `
        UPDATE users
        SET password_hash = $2
        WHERE id = $1
        RETURNING ${publicUserColumns}
    `;

    const { rows } = await pool.query(query, [id, passwordHash]);
    return rows[0] || null;
};

const updatePreferences = async (id, preferences) => {
    const query = `
        UPDATE users
        SET preferences = $2::jsonb
        WHERE id = $1
        RETURNING ${publicUserColumns}
    `;

    const { rows } = await pool.query(query, [id, JSON.stringify(preferences)]);
    return rows[0] || null;
};

module.exports = {
    createUser,
    findByIdWithPassword,
    findByEmail,
    findByIdentifier,
    findByUsername,
    findPublicById,
    updateAccountProfile,
    updatePasswordHash,
    updatePreferences,
};
