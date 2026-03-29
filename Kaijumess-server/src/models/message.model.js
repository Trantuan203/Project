const pool = require('../config/db');

const messageSelect = `
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.status,
    m.has_attachments,
    m.metadata,
    m.client_message_id,
    m.created_at,
    m.updated_at,
    attachment.id AS attachment_id,
    attachment.url AS attachment_url,
    attachment.thumbnail_url AS attachment_thumbnail_url,
    attachment.preview_url AS attachment_preview_url,
    attachment.mime_type AS attachment_mime_type,
    attachment.original_name AS attachment_original_name,
    attachment.size_bytes AS attachment_size_bytes,
    attachment.width AS attachment_width,
    attachment.height AS attachment_height,
    attachment.duration_seconds AS attachment_duration_seconds,
    attachment.storage_provider AS attachment_storage_provider,
    attachment.storage_key AS attachment_storage_key,
    attachment.public_id AS attachment_public_id,
    u.username AS sender_username,
    u.email AS sender_email,
    u.full_name AS sender_full_name,
    u.display_name AS sender_display_name,
    u.avatar_url AS sender_avatar_url
`;

const messageFromQuery = `
    FROM messages m
    LEFT JOIN users u ON u.id = m.sender_id
    LEFT JOIN LATERAL (
        SELECT
            a.id,
            a.url,
            a.thumbnail_url,
            a.preview_url,
            a.mime_type,
            a.original_name,
            a.size_bytes,
            a.width,
            a.height,
            a.duration_seconds,
            a.storage_provider,
            a.storage_key,
            a.public_id
        FROM attachments a
        WHERE a.message_id = m.id
        ORDER BY a.created_at ASC
        LIMIT 1
    ) attachment ON TRUE
`;

const assertConversationParticipant = async ({ client = pool, conversationId, userId }) => {
    const query = `
        SELECT 1
        FROM participants
        WHERE conversation_id = $1
          AND user_id = $2
          AND left_at IS NULL
          AND removed_at IS NULL
        LIMIT 1
    `;

    const { rows } = await client.query(query, [conversationId, userId]);
    return Boolean(rows[0]);
};

const findCursorMessage = async ({ beforeMessageId, client = pool, conversationId }) => {
    if (!beforeMessageId) {
        return null;
    }

    const query = `
        SELECT id, created_at
        FROM messages
        WHERE id = $1
          AND conversation_id = $2
          AND is_deleted = FALSE
        LIMIT 1
    `;

    const { rows } = await client.query(query, [beforeMessageId, conversationId]);
    return rows[0] || null;
};

const listMessagesByConversation = async ({
    beforeMessageId = '',
    conversationId,
    limit = 30,
    userId,
}) => {
    const hasAccess = await assertConversationParticipant({ conversationId, userId });

    if (!hasAccess) {
        return null;
    }

    const cursorMessage = await findCursorMessage({ beforeMessageId, conversationId });

    const query = `
        SELECT ${messageSelect}
        ${messageFromQuery}
        WHERE m.conversation_id = $1
          AND m.is_deleted = FALSE
          AND (
              $3::timestamptz IS NULL
              OR m.created_at < $3::timestamptz
              OR (m.created_at = $3::timestamptz AND m.id::text < $4::text)
          )
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT $2
    `;

    const { rows } = await pool.query(query, [
        conversationId,
        limit + 1,
        cursorMessage?.created_at || null,
        cursorMessage?.id || null,
    ]);

    const hasMore = rows.length > limit;
    const slicedRows = hasMore ? rows.slice(0, limit) : rows;

    return {
        hasMore,
        messages: slicedRows.reverse(),
    };
};

const markConversationRead = async ({ conversationId, lastMessageId, userId }) => {
    if (!lastMessageId) {
        return null;
    }

    const query = `
        UPDATE participants
        SET unread_count = 0,
            last_read_at = NOW(),
            last_read_message_id = $3,
            last_delivered_at = NOW()
        WHERE conversation_id = $1
          AND user_id = $2
          AND left_at IS NULL
          AND removed_at IS NULL
        RETURNING id
    `;

    const { rows } = await pool.query(query, [conversationId, userId, lastMessageId]);
    return rows[0] || null;
};

const findMessageByClientMessageId = async ({ clientMessageId }) => {
    const query = `
        SELECT ${messageSelect}
        ${messageFromQuery}
        WHERE m.client_message_id = $1
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [clientMessageId]);
    return rows[0] || null;
};

const createMessage = async ({
    attachment = null,
    clientMessageId,
    content,
    conversationId,
    metadata = {},
    senderId,
    type = 'text',
}) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const hasAccess = await assertConversationParticipant({
            client,
            conversationId,
            userId: senderId,
        });

        if (!hasAccess) {
            await client.query('ROLLBACK');
            return null;
        }

        const insertedMessageResult = await client.query(
            `
                INSERT INTO messages (
                    conversation_id,
                    sender_id,
                    content,
                    type,
                    status,
                    client_message_id,
                    metadata,
                    has_attachments
                )
                VALUES ($1, $2, NULLIF($3, ''), $4, 'sent', NULLIF($5, ''), $6::jsonb, $7)
                RETURNING id
            `,
            [
                conversationId,
                senderId,
                content || '',
                type,
                clientMessageId || '',
                JSON.stringify(metadata || {}),
                Boolean(attachment),
            ]
        );
        const messageId = insertedMessageResult.rows[0].id;

        if (attachment) {
            await client.query(
                `
                    INSERT INTO attachments (
                        message_id,
                        url,
                        file_type,
                        size_bytes,
                        original_name,
                        storage_provider,
                        storage_key,
                        public_id,
                        thumbnail_url,
                        preview_url,
                        mime_type,
                        file_extension,
                        width,
                        height,
                        duration_seconds
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `,
                [
                    messageId,
                    attachment.secureUrl,
                    attachment.resourceType,
                    attachment.fileSize,
                    attachment.fileName,
                    attachment.storageProvider,
                    attachment.storageKey,
                    attachment.publicId,
                    attachment.thumbnailUrl,
                    attachment.previewUrl,
                    attachment.mimeType,
                    attachment.fileExtension,
                    attachment.width,
                    attachment.height,
                    attachment.durationSeconds,
                ]
            );
        }

        await client.query(
            `
                UPDATE participants
                SET unread_count = 0,
                    last_read_at = NOW(),
                    last_read_message_id = $3,
                    last_delivered_at = NOW()
                WHERE conversation_id = $1
                  AND user_id = $2
            `,
            [conversationId, senderId, messageId]
        );

        await client.query(
            `
                UPDATE participants
                SET unread_count = unread_count + 1,
                    last_delivered_at = NOW()
                WHERE conversation_id = $1
                  AND user_id <> $2
                  AND left_at IS NULL
                  AND removed_at IS NULL
            `,
            [conversationId, senderId]
        );

        const selectedMessageResult = await client.query(
            `
                SELECT ${messageSelect}
                ${messageFromQuery}
                WHERE m.id = $1
                LIMIT 1
            `,
            [messageId]
        );

        await client.query('COMMIT');
        return selectedMessageResult.rows[0] || null;
    } catch (error) {
        await client.query('ROLLBACK');

        if (error?.code === '23505' && clientMessageId) {
            return findMessageByClientMessageId({ clientMessageId });
        }

        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    createMessage,
    listMessagesByConversation,
    markConversationRead,
};
