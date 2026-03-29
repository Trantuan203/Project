const pool = require('../config/db');

const sessionColumns = `
    id,
    user_id,
    user_agent,
    ip_address::text AS ip_address,
    metadata,
    created_at,
    last_seen_at,
    revoked_at,
    revoked_reason
`;

const createSession = async ({ id, ipAddress, metadata = {}, userAgent, userId }) => {
    const query = `
        INSERT INTO user_sessions (id, user_id, user_agent, ip_address, metadata)
        VALUES ($1, $2, $3, NULLIF($4, '')::inet, $5::jsonb)
        RETURNING ${sessionColumns}
    `;

    const { rows } = await pool.query(query, [
        id,
        userId,
        userAgent || null,
        ipAddress || '',
        JSON.stringify(metadata),
    ]);

    return rows[0] || null;
};

const findActiveSessionById = async (id) => {
    const query = `
        SELECT ${sessionColumns}
        FROM user_sessions
        WHERE id = $1
          AND revoked_at IS NULL
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

const touchSession = async (id) => {
    const query = `
        UPDATE user_sessions
        SET last_seen_at = NOW()
        WHERE id = $1
          AND revoked_at IS NULL
        RETURNING ${sessionColumns}
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

const listActiveSessionsByUserId = async (userId) => {
    const query = `
        SELECT ${sessionColumns}
        FROM user_sessions
        WHERE user_id = $1
          AND revoked_at IS NULL
        ORDER BY last_seen_at DESC, created_at DESC
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows;
};

const revokeSession = async ({ reason = 'manual', sessionId, userId }) => {
    const query = `
        UPDATE user_sessions
        SET revoked_at = NOW(),
            revoked_reason = $3
        WHERE id = $1
          AND user_id = $2
          AND revoked_at IS NULL
        RETURNING ${sessionColumns}
    `;

    const { rows } = await pool.query(query, [sessionId, userId, reason]);
    return rows[0] || null;
};

module.exports = {
    createSession,
    findActiveSessionById,
    listActiveSessionsByUserId,
    revokeSession,
    touchSession,
};
