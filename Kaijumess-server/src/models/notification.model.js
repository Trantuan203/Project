const pool = require('../config/db');

const ensureNotificationStateSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_states (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notification_key TEXT NOT NULL,
            read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, notification_key)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_states_user_read
            ON notification_states (user_id, read_at DESC)
    `);
};

const listRecentTextMessagesForUser = async ({ limit = 80, userId }) => {
    const { rows } = await pool.query(
        `
            SELECT
                m.id,
                m.conversation_id,
                m.content,
                m.created_at,
                sender.id AS sender_id,
                sender.username AS sender_username,
                sender.email AS sender_email,
                sender.full_name AS sender_full_name,
                sender.display_name AS sender_display_name,
                sender.avatar_url AS sender_avatar_url,
                c.name AS conversation_name
            FROM participants current_participant
            JOIN messages m
              ON m.conversation_id = current_participant.conversation_id
             AND m.deleted_at IS NULL
             AND m.type = 'text'
            JOIN conversations c ON c.id = m.conversation_id
            JOIN users sender ON sender.id = m.sender_id
            WHERE current_participant.user_id = $1
              AND current_participant.left_at IS NULL
              AND current_participant.removed_at IS NULL
              AND m.sender_id <> $1
              AND c.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT $2
        `,
        [userId, limit]
    );

    return rows;
};

const listNotificationStates = async ({ notificationKeys, userId }) => {
    if (!Array.isArray(notificationKeys) || notificationKeys.length === 0) {
        return [];
    }

    const { rows } = await pool.query(
        `
            SELECT notification_key, read_at
            FROM notification_states
            WHERE user_id = $1
              AND notification_key = ANY($2::text[])
        `,
        [userId, notificationKeys]
    );

    return rows;
};

const markNotificationRead = async ({ notificationKey, userId }) => {
    const { rows } = await pool.query(
        `
            INSERT INTO notification_states (user_id, notification_key, read_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id, notification_key)
            DO UPDATE SET read_at = EXCLUDED.read_at
            RETURNING notification_key, read_at
        `,
        [userId, notificationKey]
    );

    return rows[0] || null;
};

const markNotificationsRead = async ({ notificationKeys, userId }) => {
    if (!Array.isArray(notificationKeys) || notificationKeys.length === 0) {
        return [];
    }

    const { rows } = await pool.query(
        `
            INSERT INTO notification_states (user_id, notification_key, read_at)
            SELECT $1, UNNEST($2::text[]), NOW()
            ON CONFLICT (user_id, notification_key)
            DO UPDATE SET read_at = EXCLUDED.read_at
            RETURNING notification_key, read_at
        `,
        [userId, notificationKeys]
    );

    return rows;
};

module.exports = {
    ensureNotificationStateSchema,
    listNotificationStates,
    listRecentTextMessagesForUser,
    markNotificationRead,
    markNotificationsRead,
};
