const pool = require('../config/db');

const isMissingCallsTableError = (error) => (
    error?.code === '42P01' && /calls/i.test(error?.message || '')
);

const ensureCallsSchema = async () => {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS calls (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            answered_by UUID REFERENCES users(id) ON DELETE SET NULL,
            ended_by UUID REFERENCES users(id) ON DELETE SET NULL,
            type VARCHAR(10) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'calling',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            answered_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            duration_seconds INTEGER,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            CHECK (type IN ('audio', 'video')),
            CHECK (status IN ('calling', 'ongoing', 'ended', 'rejected', 'busy', 'missed'))
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_calls_conversation_created
            ON calls (conversation_id, created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_calls_initiated_by_created
            ON calls (initiated_by, created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_calls_status_active
            ON calls (status, created_at DESC)
            WHERE status IN ('calling', 'ongoing')
    `);
};

const listCallsForUser = async ({
    date = '',
    limit = 15,
    offset = 0,
    query: rawQuery = '',
    userId,
}) => {
    const queryText = rawQuery.trim();
    const normalizedDate = typeof date === 'string' && date.trim() ? date.trim() : null;

    const sql = `
        SELECT
            call_item.id,
            call_item.conversation_id,
            call_item.initiated_by,
            call_item.answered_by,
            call_item.ended_by,
            call_item.type,
            call_item.status,
            call_item.created_at,
            call_item.answered_at,
            call_item.ended_at,
            call_item.duration_seconds,
            conv.name AS conversation_name,
            conv.type AS conversation_type,
            peer.id AS peer_id,
            peer.username AS peer_username,
            peer.email AS peer_email,
            peer.full_name AS peer_full_name,
            peer.display_name AS peer_display_name,
            peer.avatar_url AS peer_avatar_url,
            peer.status AS peer_status
        FROM calls call_item
        JOIN conversations conv ON conv.id = call_item.conversation_id
        JOIN participants current_participant
            ON current_participant.conversation_id = conv.id
           AND current_participant.user_id = $1
           AND current_participant.left_at IS NULL
           AND current_participant.removed_at IS NULL
        LEFT JOIN LATERAL (
            SELECT
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.display_name,
                u.avatar_url,
                u.status
            FROM participants p2
            JOIN users u ON u.id = p2.user_id
            WHERE p2.conversation_id = conv.id
              AND p2.user_id <> $1
              AND p2.left_at IS NULL
              AND p2.removed_at IS NULL
            ORDER BY p2.joined_at ASC
            LIMIT 1
        ) peer ON conv.type = 'direct'
        WHERE conv.deleted_at IS NULL
          AND (
              $2 = ''
              OR COALESCE(peer.display_name, peer.full_name, peer.username, peer.email, conv.name, '') ILIKE '%' || $2 || '%'
          )
          AND (
              $3::date IS NULL
              OR (
                  call_item.created_at >= $3::date
                  AND call_item.created_at < ($3::date + INTERVAL '1 day')
              )
          )
        ORDER BY call_item.created_at DESC, call_item.id DESC
        LIMIT $4
        OFFSET $5
    `;

    const { rows } = await pool.query(sql, [userId, queryText, normalizedDate, limit, offset]);
    return rows;
};

module.exports = {
    ensureCallsSchema,
    isMissingCallsTableError,
    listCallsForUser,
};
