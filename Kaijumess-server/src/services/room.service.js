const callModel = require('../models/call.model');
const roomModel = require('../models/room.model');
const userModel = require('../models/user.model');

const createMissingFriendshipsTableError = () => {
    const error = new Error('Friendship storage is not ready. Apply 004_friendships.sql first.');
    error.code = 'FRIENDSHIP_STORAGE_NOT_READY';
    error.statusCode = 503;
    return error;
};

const withFriendshipStorage = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        if (!roomModel.isMissingFriendshipsTableError(error)) {
            throw error;
        }

        try {
            await roomModel.ensureFriendshipsSchema();
        } catch {
            throw createMissingFriendshipsTableError();
        }

        return operation();
    }
};

const createMissingCallsTableError = () => {
    const error = new Error('Call storage is not ready. Apply 005_calls.sql first.');
    error.code = 'CALL_STORAGE_NOT_READY';
    error.statusCode = 503;
    return error;
};

const withCallStorage = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        if (!callModel.isMissingCallsTableError(error)) {
            throw error;
        }

        try {
            await callModel.ensureCallsSchema();
        } catch {
            throw createMissingCallsTableError();
        }

        return operation();
    }
};

const buildConversationTitle = (room) => (
    room.type === 'direct'
        ? room.peer_nickname ||
          room.peer_display_name ||
          room.peer_full_name ||
          room.peer_username ||
          room.peer_email ||
          'Direct chat'
        : room.name || 'Group chat'
);

const buildConversationAvatar = (room) => (
    room.type === 'direct' ? room.peer_avatar_url || '' : room.avatar_url || ''
);

const buildLastMessagePreview = (room) => {
    if (!room.last_message_id) {
        return 'No messages yet.';
    }

    if (room.last_message_type === 'text') {
        return room.last_message_content || '';
    }

    return `[${room.last_message_type}]`;
};

const mapEmbeddedFriendship = (record, currentUserId) => {
    if (!record.friendship_id) {
        return null;
    }

    return {
        addresseeId: record.friendship_addressee_id,
        direction:
            record.friendship_requester_id === currentUserId
                ? 'outgoing'
                : record.friendship_addressee_id === currentUserId
                  ? 'incoming'
                  : null,
        id: record.friendship_id,
        isFriend: record.friendship_status === 'accepted',
        isPending: record.friendship_status === 'pending',
        requesterId: record.friendship_requester_id,
        status: record.friendship_status,
    };
};

const mapFriendshipRow = (friendship, currentUserId) => {
    if (!friendship?.id) {
        return null;
    }

    return {
        addresseeId: friendship.addressee_id,
        direction:
            friendship.requester_id === currentUserId
                ? 'outgoing'
                : friendship.addressee_id === currentUserId
                  ? 'incoming'
                  : null,
        id: friendship.id,
        isFriend: friendship.status === 'accepted',
        isPending: friendship.status === 'pending',
        requesterId: friendship.requester_id,
        status: friendship.status,
    };
};

const mapConversation = (room, currentUserId) => {
    const friendship = mapEmbeddedFriendship(room, currentUserId);

    return {
        avatarUrl: buildConversationAvatar(room),
        createdAt: room.created_at,
        friendship,
        id: room.id,
        isDirect: room.type === 'direct',
        isOnline: room.peer_status === 'online',
        isPinned: Boolean(room.is_pinned),
        lastMessageAt: room.last_message_at || room.last_message_created_at || room.created_at,
        lastMessagePreview: buildLastMessagePreview(room),
        messageCount: Number(room.message_count || 0),
        participantCount: Number(room.participant_count || 0),
        peer: room.peer_id
            ? {
                avatarUrl: room.peer_avatar_url || '',
                displayName:
                    room.peer_nickname ||
                    room.peer_display_name ||
                    room.peer_full_name ||
                    room.peer_username ||
                    room.peer_email ||
                    'Direct chat',
                email: room.peer_email || '',
                friendship,
                id: room.peer_id,
                lastSeen: room.peer_last_seen,
                nickname: room.peer_nickname || '',
                status: room.peer_status || 'offline',
                username: room.peer_username || '',
            }
            : null,
        selfNickname: room.self_nickname || '',
        title: buildConversationTitle(room),
        type: room.type,
        unreadCount: Number(room.unread_count || 0),
        updatedAt: room.updated_at,
    };
};

const mapUserSearchResult = (user, currentUserId) => ({
    avatarUrl: user.avatar_url || '',
    directConversationId: user.direct_conversation_id || '',
    displayName: user.display_name || user.full_name || user.username || user.email,
    email: user.email || '',
    friendship: mapEmbeddedFriendship(user, currentUserId),
    id: user.id,
    isOnline: user.status === 'online',
    lastSeen: user.last_seen,
    username: user.username || '',
});

const mapFriendListItem = (user, currentUserId) => ({
    avatarUrl: user.avatar_url || '',
    directConversationId: user.direct_conversation_id || '',
    displayName: user.display_name || user.full_name || user.username || user.email,
    email: user.email || '',
    friendship: mapEmbeddedFriendship(user, currentUserId),
    id: user.id,
    isOnline: user.status === 'online',
    lastCallAt: user.last_call_at,
    lastInteractedAt: user.direct_last_message_at || user.last_call_at || user.last_seen || null,
    lastMessagePreview: user.direct_conversation_id ? 'Open your recent conversation.' : '',
    lastSeen: user.last_seen,
    username: user.username || '',
});

const mapCallRecord = (record, currentUserId) => ({
    answeredAt: record.answered_at,
    answeredBy: record.answered_by,
    conversationId: record.conversation_id,
    conversationTitle:
        record.peer_display_name ||
        record.peer_full_name ||
        record.peer_username ||
        record.peer_email ||
        record.conversation_name ||
        'Direct call',
    createdAt: record.created_at,
    direction: record.initiated_by === currentUserId ? 'outgoing' : 'incoming',
    durationSeconds: record.duration_seconds,
    endedAt: record.ended_at,
    endedBy: record.ended_by,
    id: record.id,
    peer: record.peer_id
        ? {
            avatarUrl: record.peer_avatar_url || '',
            displayName:
                record.peer_display_name ||
                record.peer_full_name ||
                record.peer_username ||
                record.peer_email ||
                'Direct call',
            email: record.peer_email || '',
            id: record.peer_id,
            status: record.peer_status || 'offline',
            username: record.peer_username || '',
        }
        : null,
    status: record.status,
    type: record.type,
});

const buildPageInfo = ({ limit, offset, rowCount }) => ({
    hasMore: rowCount > limit,
    limit,
    nextOffset: rowCount > limit ? offset + limit : null,
    offset,
});

const listRooms = async (userId, search) => {
    const rooms = await roomModel.listUserConversations({ search, userId });
    return rooms.map((room) => mapConversation(room, userId));
};

const ensureRoomAccess = async (userId, conversationId) => {
    const room = await roomModel.findConversationForUser({ conversationId, userId });

    if (!room) {
        const error = new Error('Conversation not found.');
        error.code = 'CONVERSATION_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    return mapConversation(room, userId);
};

const createOrGetDirectRoom = async (userId, targetUserId) => {
    if (!targetUserId) {
        const error = new Error('targetUserId is required.');
        error.code = 'MISSING_TARGET_USER';
        error.field = 'targetUserId';
        error.statusCode = 400;
        throw error;
    }

    if (userId === targetUserId) {
        const error = new Error('You cannot start a direct conversation with yourself.');
        error.code = 'INVALID_TARGET_USER';
        error.field = 'targetUserId';
        error.statusCode = 400;
        throw error;
    }

    const targetUser = await userModel.findPublicById(targetUserId);

    if (!targetUser) {
        const error = new Error('Target user not found.');
        error.code = 'TARGET_USER_NOT_FOUND';
        error.field = 'targetUserId';
        error.statusCode = 404;
        throw error;
    }

    const result = await roomModel.createDirectConversation({
        firstUserId: userId,
        secondUserId: targetUserId,
    });

    return {
        created: result.created,
        room: await ensureRoomAccess(userId, result.conversationId),
    };
};

const updateParticipantNickname = async (userId, conversationId, targetUserId, nextNickname) => {
    const room = await roomModel.findConversationForUser({ conversationId, userId });

    if (!room) {
        const error = new Error('Conversation not found.');
        error.code = 'CONVERSATION_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    if (room.type !== 'direct') {
        const error = new Error('Only direct conversations support shared nicknames right now.');
        error.code = 'UNSUPPORTED_CONVERSATION_TYPE';
        error.statusCode = 400;
        throw error;
    }

    if (!targetUserId || ![userId, room.peer_id].includes(targetUserId)) {
        const error = new Error('Target participant not found in this conversation.');
        error.code = 'TARGET_PARTICIPANT_NOT_FOUND';
        error.field = 'targetUserId';
        error.statusCode = 404;
        throw error;
    }

    const normalizedNickname = typeof nextNickname === 'string' ? nextNickname.trim() : '';

    if (normalizedNickname.length > 120) {
        const error = new Error('Nickname must be 120 characters or fewer.');
        error.code = 'INVALID_PARTICIPANT_NICKNAME';
        error.field = 'nickname';
        error.statusCode = 400;
        throw error;
    }

    await roomModel.updateParticipantNickname({
        conversationId,
        nickname: normalizedNickname || null,
        targetUserId,
    });

    return ensureRoomAccess(userId, conversationId);
};

const searchAvailableUsers = async (userId, {
    excludeAcceptedFriends = false,
    limit = 20,
    offset = 0,
    query,
} = {}) => {
    const trimmedQuery = typeof query === 'string' ? query.trim() : '';

    if (trimmedQuery.length < 2) {
        return {
            pageInfo: buildPageInfo({ limit, offset, rowCount: 0 }),
            users: [],
        };
    }

    const rows = await roomModel.searchUsers({
        excludeAcceptedFriends,
        limit: limit + 1,
        offset,
        query: trimmedQuery,
        userId,
    });

    return {
        pageInfo: buildPageInfo({ limit, offset, rowCount: rows.length }),
        users: rows.slice(0, limit).map((user) => mapUserSearchResult(user, userId)),
    };
};

const listFriends = async (userId, { limit = 20, offset = 0, query = '' } = {}) => {
    const rows = await withFriendshipStorage(() =>
        roomModel.listAcceptedFriends({
            limit: limit + 1,
            offset,
            query,
            userId,
        })
    );

    return {
        friends: rows.slice(0, limit).map((user) => mapFriendListItem(user, userId)),
        pageInfo: buildPageInfo({ limit, offset, rowCount: rows.length }),
    };
};

const listCalls = async (userId, { date = '', limit = 15, offset = 0, query = '' } = {}) => {
    const rows = await withCallStorage(() =>
        callModel.listCallsForUser({
            date,
            limit: limit + 1,
            offset,
            query,
            userId,
        })
    );

    return {
        calls: rows.slice(0, limit).map((record) => mapCallRecord(record, userId)),
        pageInfo: buildPageInfo({ limit, offset, rowCount: rows.length }),
    };
};

const requestFriendship = async (userId, targetUserId) => {
    if (!targetUserId) {
        const error = new Error('targetUserId is required.');
        error.code = 'MISSING_TARGET_USER';
        error.field = 'targetUserId';
        error.statusCode = 400;
        throw error;
    }

    if (userId === targetUserId) {
        const error = new Error('You cannot add yourself as a friend.');
        error.code = 'INVALID_TARGET_USER';
        error.field = 'targetUserId';
        error.statusCode = 400;
        throw error;
    }

    const targetUser = await userModel.findPublicById(targetUserId);

    if (!targetUser) {
        const error = new Error('Target user not found.');
        error.code = 'TARGET_USER_NOT_FOUND';
        error.field = 'targetUserId';
        error.statusCode = 404;
        throw error;
    }

    let existingFriendship = await withFriendshipStorage(() =>
        roomModel.findPairFriendship({
            firstUserId: userId,
            secondUserId: targetUserId,
        })
    );

    if (!existingFriendship) {
        const friendship = await withFriendshipStorage(() =>
            roomModel.createFriendRequest({
                addresseeId: targetUserId,
                requesterId: userId,
            })
        );

        return {
            friendship: mapFriendshipRow(friendship, userId),
            meta: {
                autoAccepted: false,
                isNew: true,
                status: friendship.status,
            },
        };
    }

    if (existingFriendship.status === 'accepted') {
        return {
            friendship: mapFriendshipRow(existingFriendship, userId),
            meta: {
                autoAccepted: false,
                isNew: false,
                status: existingFriendship.status,
            },
        };
    }

    if (
        existingFriendship.status === 'pending' &&
        existingFriendship.addressee_id === userId &&
        existingFriendship.requester_id === targetUserId
    ) {
        const friendship = await withFriendshipStorage(() =>
            roomModel.acceptFriendRequest({
                friendshipId: existingFriendship.id,
            })
        );

        return {
            friendship: mapFriendshipRow(friendship, userId),
            meta: {
                autoAccepted: true,
                isNew: false,
                status: friendship.status,
            },
        };
    }

    if (
        existingFriendship.status === 'pending' &&
        existingFriendship.requester_id === userId &&
        existingFriendship.addressee_id === targetUserId
    ) {
        return {
            friendship: mapFriendshipRow(existingFriendship, userId),
            meta: {
                autoAccepted: false,
                isNew: false,
                status: existingFriendship.status,
            },
        };
    }

    const friendship = await withFriendshipStorage(() =>
        roomModel.reopenFriendRequest({
            addresseeId: targetUserId,
            friendshipId: existingFriendship.id,
            requesterId: userId,
        })
    );

    return {
        friendship: mapFriendshipRow(friendship, userId),
        meta: {
            autoAccepted: false,
            isNew: false,
            status: friendship.status,
        },
    };
};

module.exports = {
    createOrGetDirectRoom,
    ensureRoomAccess,
    listCalls,
    listFriends,
    listRooms,
    requestFriendship,
    searchAvailableUsers,
    updateParticipantNickname,
};
