const { randomUUID } = require('crypto');
const pool = require('../config/db');

const isMissingFriendshipsTableError = (error) => (
    error?.code === '42P01' && /friendships/i.test(error?.message || '')
);

const isMissingCallsTableError = (error) => (
    error?.code === '42P01' && /calls/i.test(error?.message || '')
);

const ensureFriendshipsSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS friendships (
            id UUID PRIMARY KEY,
            requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            accepted_at TIMESTAMPTZ,
            CHECK (requester_id <> addressee_id),
            CHECK (status IN ('pending', 'accepted', 'rejected'))
        )
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair
            ON friendships (
                LEAST(requester_id, addressee_id),
                GREATEST(requester_id, addressee_id)
            )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_friendships_requester
            ON friendships (requester_id, status)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_friendships_addressee
            ON friendships (addressee_id, status)
    `);
};

const conversationSelectBase = `
    c.id,
    c.type,
    c.name,
    c.avatar_url,
    c.description,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.message_count,
    c.participant_count,
    p.nickname AS self_nickname,
    p.unread_count,
    p.is_pinned,
    p.last_read_at,
    lm.id AS last_message_id,
    lm.content AS last_message_content,
    lm.type AS last_message_type,
    lm.created_at AS last_message_created_at,
    lm.sender_id AS last_message_sender_id,
    peer.id AS peer_id,
    peer.username AS peer_username,
    peer.email AS peer_email,
    peer.full_name AS peer_full_name,
    peer.display_name AS peer_display_name,
    peer.participant_nickname AS peer_nickname,
    peer.avatar_url AS peer_avatar_url,
    peer.status AS peer_status,
    peer.last_seen AS peer_last_seen
`;

const conversationFriendshipSelect = `
    ,
    f.id AS friendship_id,
    f.status AS friendship_status,
    f.requester_id AS friendship_requester_id,
    f.addressee_id AS friendship_addressee_id
`;

const conversationFallbackFriendshipSelect = `
    ,
    NULL::uuid AS friendship_id,
    NULL::text AS friendship_status,
    NULL::uuid AS friendship_requester_id,
    NULL::uuid AS friendship_addressee_id
`;

const conversationSelect = `${conversationSelectBase}${conversationFriendshipSelect}`;
const conversationSelectWithoutFriendship = `${conversationSelectBase}${conversationFallbackFriendshipSelect}`;

const conversationFromClauseBase = `
    FROM participants p
    JOIN conversations c ON c.id = p.conversation_id
    LEFT JOIN messages lm ON lm.id = c.last_message_id
    LEFT JOIN LATERAL (
        SELECT
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.display_name,
            p2.nickname AS participant_nickname,
            u.avatar_url,
            u.status,
            u.last_seen
        FROM participants p2
        JOIN users u ON u.id = p2.user_id
        WHERE p2.conversation_id = c.id
          AND p2.user_id <> $1
          AND p2.left_at IS NULL
          AND p2.removed_at IS NULL
        ORDER BY p2.joined_at ASC
        LIMIT 1
    ) peer ON c.type = 'direct'
`;

const conversationFriendshipJoin = `
    LEFT JOIN friendships f
        ON c.type = 'direct'
       AND peer.id IS NOT NULL
       AND (
            (f.requester_id = $1 AND f.addressee_id = peer.id)
            OR (f.requester_id = peer.id AND f.addressee_id = $1)
       )
`;

const conversationWhereClause = `
    WHERE p.user_id = $1
      AND p.left_at IS NULL
      AND p.removed_at IS NULL
      AND c.deleted_at IS NULL
`;

const conversationFromClause = `${conversationFromClauseBase}${conversationFriendshipJoin}${conversationWhereClause}`;
const conversationFromClauseWithoutFriendship = `${conversationFromClauseBase}${conversationWhereClause}`;

const runConversationQuery = async ({ fallbackQuery, params, query }) => {
    try {
        const { rows } = await pool.query(query, params);
        return rows;
    } catch (error) {
        if (!isMissingFriendshipsTableError(error)) {
            throw error;
        }

        const { rows } = await pool.query(fallbackQuery, params);
        return rows;
    }
};

const listUserConversations = async ({ limit = 50, search = '', userId }) => {
    const query = `
        SELECT ${conversationSelect}
        ${conversationFromClause}
          AND (
              $2 = ''
              OR COALESCE(c.name, '') ILIKE '%' || $2 || '%'
              OR COALESCE(peer.participant_nickname, '') ILIKE '%' || $2 || '%'
              OR COALESCE(peer.full_name, peer.display_name, peer.username, peer.email, '') ILIKE '%' || $2 || '%'
              OR COALESCE(lm.content, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
        LIMIT $3
    `;

    const fallbackQuery = `
        SELECT ${conversationSelectWithoutFriendship}
        ${conversationFromClauseWithoutFriendship}
          AND (
              $2 = ''
              OR COALESCE(c.name, '') ILIKE '%' || $2 || '%'
              OR COALESCE(peer.participant_nickname, '') ILIKE '%' || $2 || '%'
              OR COALESCE(peer.full_name, peer.display_name, peer.username, peer.email, '') ILIKE '%' || $2 || '%'
              OR COALESCE(lm.content, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
        LIMIT $3
    `;

    return runConversationQuery({
        fallbackQuery,
        params: [userId, search.trim(), limit],
        query,
    });
};

const findConversationForUser = async ({ conversationId, userId }) => {
    const query = `
        SELECT ${conversationSelect}
        ${conversationFromClause}
          AND c.id = $2
        LIMIT 1
    `;

    const fallbackQuery = `
        SELECT ${conversationSelectWithoutFriendship}
        ${conversationFromClauseWithoutFriendship}
          AND c.id = $2
        LIMIT 1
    `;

    const rows = await runConversationQuery({
        fallbackQuery,
        params: [userId, conversationId],
        query,
    });
    return rows[0] || null;
};

const createDirectConversation = async ({ firstUserId, secondUserId }) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingConversationResult = await client.query(
            `
                SELECT c.id
                FROM conversations c
                JOIN participants p ON p.conversation_id = c.id
                WHERE c.type = 'direct'
                  AND c.deleted_at IS NULL
                  AND p.left_at IS NULL
                  AND p.removed_at IS NULL
                GROUP BY c.id
                HAVING COUNT(*) FILTER (WHERE p.user_id IN ($1, $2)) = 2
                   AND COUNT(*) = 2
                LIMIT 1
            `,
            [firstUserId, secondUserId]
        );
        const existingConversationId = existingConversationResult.rows[0]?.id || null;

        if (existingConversationId) {
            await client.query('COMMIT');
            return {
                conversationId: existingConversationId,
                created: false,
            };
        }

        const createdConversationResult = await client.query(
            `
                INSERT INTO conversations (type, created_by, owner_id, is_private)
                VALUES ('direct', $1, $1, TRUE)
                RETURNING id
            `,
            [firstUserId]
        );
        const conversationId = createdConversationResult.rows[0].id;

        await client.query(
            `
                INSERT INTO participants (conversation_id, user_id, role)
                VALUES
                    ($1, $2, 'owner'),
                    ($1, $3, 'member')
            `,
            [conversationId, firstUserId, secondUserId]
        );

        await client.query('COMMIT');

        return {
            conversationId,
            created: true,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const searchUsers = async ({
    excludeAcceptedFriends = false,
    limit = 10,
    offset = 0,
    query: rawQuery,
    userId,
}) => {
    const queryText = rawQuery.trim();
    const query = `
        SELECT
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.display_name,
            u.avatar_url,
            u.status,
            u.last_seen,
            f.id AS friendship_id,
            f.status AS friendship_status,
            f.requester_id AS friendship_requester_id,
            f.addressee_id AS friendship_addressee_id,
            dc.id AS direct_conversation_id
        FROM users u
        LEFT JOIN friendships f
            ON (
                (f.requester_id = $1 AND f.addressee_id = u.id)
                OR (f.requester_id = u.id AND f.addressee_id = $1)
            )
        LEFT JOIN LATERAL (
            SELECT c.id
            FROM conversations c
            JOIN participants p ON p.conversation_id = c.id
            WHERE c.type = 'direct'
              AND c.deleted_at IS NULL
              AND p.left_at IS NULL
              AND p.removed_at IS NULL
            GROUP BY c.id
            HAVING COUNT(*) FILTER (WHERE p.user_id IN ($1, u.id)) = 2
               AND COUNT(*) = 2
            LIMIT 1
        ) dc ON TRUE
        WHERE u.id <> $1
          AND u.deleted_at IS NULL
          AND (
              $3::boolean = FALSE
              OR f.id IS NULL
              OR f.status <> 'accepted'
          )
          AND (
              $2 = ''
              OR u.email ILIKE '%' || $2 || '%'
              OR u.username::text ILIKE '%' || $2 || '%'
              OR COALESCE(u.full_name, '') ILIKE '%' || $2 || '%'
              OR COALESCE(u.display_name, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY
            CASE
                WHEN COALESCE(u.display_name, u.full_name, u.username::text, u.email) ILIKE $2 || '%' THEN 0
                ELSE 1
            END,
            COALESCE(u.display_name, u.full_name, u.username::text, u.email) ASC
        LIMIT $4
        OFFSET $5
    `;

    try {
        const { rows } = await pool.query(query, [userId, queryText, excludeAcceptedFriends, limit, offset]);
        return rows;
    } catch (error) {
        if (!isMissingFriendshipsTableError(error)) {
            throw error;
        }

        const fallbackQuery = `
            SELECT
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.display_name,
                u.avatar_url,
                u.status,
                u.last_seen,
                NULL::uuid AS friendship_id,
                NULL::text AS friendship_status,
                NULL::uuid AS friendship_requester_id,
                NULL::uuid AS friendship_addressee_id,
                dc.id AS direct_conversation_id
            FROM users u
            LEFT JOIN LATERAL (
                SELECT c.id
                FROM conversations c
                JOIN participants p ON p.conversation_id = c.id
                WHERE c.type = 'direct'
                  AND c.deleted_at IS NULL
                  AND p.left_at IS NULL
                  AND p.removed_at IS NULL
                GROUP BY c.id
                HAVING COUNT(*) FILTER (WHERE p.user_id IN ($1, u.id)) = 2
                   AND COUNT(*) = 2
                LIMIT 1
            ) dc ON TRUE
            WHERE u.id <> $1
              AND u.deleted_at IS NULL
              AND (
                  $2 = ''
                  OR u.email ILIKE '%' || $2 || '%'
                  OR u.username::text ILIKE '%' || $2 || '%'
                  OR COALESCE(u.full_name, '') ILIKE '%' || $2 || '%'
                  OR COALESCE(u.display_name, '') ILIKE '%' || $2 || '%'
              )
            ORDER BY
                CASE
                    WHEN COALESCE(u.display_name, u.full_name, u.username::text, u.email) ILIKE $2 || '%' THEN 0
                    ELSE 1
                END,
                COALESCE(u.display_name, u.full_name, u.username::text, u.email) ASC
            LIMIT $3
            OFFSET $4
        `;

        const { rows } = await pool.query(fallbackQuery, [userId, queryText, limit, offset]);
        return rows;
    }
};

const listAcceptedFriends = async ({ limit = 20, offset = 0, query: rawQuery = '', userId }) => {
    const queryText = rawQuery.trim();

    const sql = `
        SELECT
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.display_name,
            u.avatar_url,
            u.status,
            u.last_seen,
            f.id AS friendship_id,
            f.status AS friendship_status,
            f.requester_id AS friendship_requester_id,
            f.addressee_id AS friendship_addressee_id,
            dc.id AS direct_conversation_id,
            dc.last_message_at AS direct_last_message_at,
            dc.updated_at AS direct_updated_at,
            lc.last_call_at
        FROM friendships f
        JOIN users u
          ON u.id = CASE
              WHEN f.requester_id = $1 THEN f.addressee_id
              ELSE f.requester_id
          END
        LEFT JOIN LATERAL (
            SELECT c.id, c.last_message_at, c.updated_at
            FROM conversations c
            JOIN participants current_participant
              ON current_participant.conversation_id = c.id
             AND current_participant.user_id = $1
             AND current_participant.left_at IS NULL
             AND current_participant.removed_at IS NULL
            JOIN participants peer_participant
              ON peer_participant.conversation_id = c.id
             AND peer_participant.user_id = u.id
             AND peer_participant.left_at IS NULL
             AND peer_participant.removed_at IS NULL
            WHERE c.type = 'direct'
              AND c.deleted_at IS NULL
            LIMIT 1
        ) dc ON TRUE
        LEFT JOIN LATERAL (
            SELECT MAX(call_item.created_at) AS last_call_at
            FROM calls call_item
            WHERE dc.id IS NOT NULL
              AND call_item.conversation_id = dc.id
        ) lc ON TRUE
        WHERE f.status = 'accepted'
          AND (f.requester_id = $1 OR f.addressee_id = $1)
          AND (
              $2 = ''
              OR u.email ILIKE '%' || $2 || '%'
              OR u.username::text ILIKE '%' || $2 || '%'
              OR COALESCE(u.full_name, '') ILIKE '%' || $2 || '%'
              OR COALESCE(u.display_name, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY GREATEST(
            COALESCE(dc.last_message_at, TO_TIMESTAMP(0)),
            COALESCE(lc.last_call_at, TO_TIMESTAMP(0)),
            COALESCE(f.accepted_at, f.updated_at, TO_TIMESTAMP(0))
        ) DESC,
        COALESCE(u.display_name, u.full_name, u.username::text, u.email) ASC
        LIMIT $3
        OFFSET $4
    `;

    try {
        const { rows } = await pool.query(sql, [userId, queryText, limit, offset]);
        return rows;
    } catch (error) {
        if (!isMissingCallsTableError(error)) {
            throw error;
        }

        const fallbackSql = `
            SELECT
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.display_name,
                u.avatar_url,
                u.status,
                u.last_seen,
                f.id AS friendship_id,
                f.status AS friendship_status,
                f.requester_id AS friendship_requester_id,
                f.addressee_id AS friendship_addressee_id,
                dc.id AS direct_conversation_id,
                dc.last_message_at AS direct_last_message_at,
                dc.updated_at AS direct_updated_at,
                NULL::timestamptz AS last_call_at
            FROM friendships f
            JOIN users u
              ON u.id = CASE
                  WHEN f.requester_id = $1 THEN f.addressee_id
                  ELSE f.requester_id
              END
            LEFT JOIN LATERAL (
                SELECT c.id, c.last_message_at, c.updated_at
                FROM conversations c
                JOIN participants current_participant
                  ON current_participant.conversation_id = c.id
                 AND current_participant.user_id = $1
                 AND current_participant.left_at IS NULL
                 AND current_participant.removed_at IS NULL
                JOIN participants peer_participant
                  ON peer_participant.conversation_id = c.id
                 AND peer_participant.user_id = u.id
                 AND peer_participant.left_at IS NULL
                 AND peer_participant.removed_at IS NULL
                WHERE c.type = 'direct'
                  AND c.deleted_at IS NULL
                LIMIT 1
            ) dc ON TRUE
            WHERE f.status = 'accepted'
              AND (f.requester_id = $1 OR f.addressee_id = $1)
              AND (
                  $2 = ''
                  OR u.email ILIKE '%' || $2 || '%'
                  OR u.username::text ILIKE '%' || $2 || '%'
                  OR COALESCE(u.full_name, '') ILIKE '%' || $2 || '%'
                  OR COALESCE(u.display_name, '') ILIKE '%' || $2 || '%'
              )
            ORDER BY GREATEST(
                COALESCE(dc.last_message_at, TO_TIMESTAMP(0)),
                COALESCE(f.accepted_at, f.updated_at, TO_TIMESTAMP(0))
            ) DESC,
            COALESCE(u.display_name, u.full_name, u.username::text, u.email) ASC
            LIMIT $3
            OFFSET $4
        `;

        const { rows } = await pool.query(fallbackSql, [userId, queryText, limit, offset]);
        return rows;
    }
};

const findPairFriendship = async ({ firstUserId, secondUserId }) => {
    const query = `
        SELECT *
        FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [firstUserId, secondUserId]);
    return rows[0] || null;
};

const createFriendRequest = async ({ addresseeId, requesterId }) => {
    const query = `
        INSERT INTO friendships (id, requester_id, addressee_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
    `;

    const { rows } = await pool.query(query, [randomUUID(), requesterId, addresseeId]);
    return rows[0] || null;
};

const acceptFriendRequest = async ({ friendshipId }) => {
    const query = `
        UPDATE friendships
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;

    const { rows } = await pool.query(query, [friendshipId]);
    return rows[0] || null;
};

const updateParticipantNickname = async ({ conversationId, nickname, targetUserId }) => {
    const query = `
        UPDATE participants
        SET nickname = $3,
            updated_at = NOW()
        WHERE conversation_id = $1
          AND user_id = $2
          AND left_at IS NULL
          AND removed_at IS NULL
        RETURNING conversation_id, user_id, nickname, updated_at
    `;

    const { rows } = await pool.query(query, [conversationId, targetUserId, nickname]);
    return rows[0] || null;
};

const reopenFriendRequest = async ({ addresseeId, friendshipId, requesterId }) => {
    const query = `
        UPDATE friendships
        SET requester_id = $2,
            addressee_id = $3,
            status = 'pending',
            accepted_at = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;

    const { rows } = await pool.query(query, [friendshipId, requesterId, addresseeId]);
    return rows[0] || null;
};

module.exports = {
    acceptFriendRequest,
    createDirectConversation,
    createFriendRequest,
    ensureFriendshipsSchema,
    findConversationForUser,
    findPairFriendship,
    isMissingFriendshipsTableError,
    listAcceptedFriends,
    listUserConversations,
    reopenFriendRequest,
    searchUsers,
    updateParticipantNickname,
};
