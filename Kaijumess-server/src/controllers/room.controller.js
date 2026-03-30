const roomService = require('../services/room.service');

const listRooms = async (req, res) => {
    try {
        const rooms = await roomService.listRooms(req.user.sub, req.query.search || '');
        return res.status(200).json({ rooms });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const parsePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return fallback;
    }

    return parsedValue;
};

const createDirectRoom = async (req, res) => {
    try {
        const result = await roomService.createOrGetDirectRoom(req.user.sub, req.body?.targetUserId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const searchUsers = async (req, res) => {
    try {
        const result = await roomService.searchAvailableUsers(req.user.sub, {
            excludeAcceptedFriends: req.query.excludeAcceptedFriends === 'true',
            limit: parsePositiveInteger(req.query.limit, 20),
            offset: parsePositiveInteger(req.query.offset, 0),
            query: req.query.q || '',
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const listFriends = async (req, res) => {
    try {
        const result = await roomService.listFriends(req.user.sub, {
            limit: parsePositiveInteger(req.query.limit, 20),
            offset: parsePositiveInteger(req.query.offset, 0),
            query: req.query.q || '',
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const listCalls = async (req, res) => {
    try {
        const result = await roomService.listCalls(req.user.sub, {
            date: req.query.date || '',
            limit: parsePositiveInteger(req.query.limit, 15),
            offset: parsePositiveInteger(req.query.offset, 0),
            query: req.query.q || '',
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const createFriendRequest = async (req, res) => {
    try {
        const result = await roomService.requestFriendship(req.user.sub, req.body?.targetUserId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const listPendingFriendRequests = async (req, res) => {
    try {
        const users = await roomService.listPendingFriendRequestsByDirection(
            req.user.sub,
            req.query.direction || 'incoming',
            req.query.q || '',
        );
        return res.status(200).json({ users });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const updateParticipantNickname = async (req, res) => {
    try {
        const room = await roomService.updateParticipantNickname(
            req.user.sub,
            req.params.conversationId,
            req.params.targetUserId,
            req.body?.nickname,
        );

        const io = req.app.get('io');

        if (io && room?.id) {
            const participantUserIds = [req.user.sub, room.peer?.id].filter(Boolean);

            await Promise.allSettled(
                participantUserIds.map(async (participantUserId) => {
                    const snapshot = await roomService.ensureRoomAccess(participantUserId, room.id);
                    io.to(`user:${participantUserId}`).emit('conversation:updated', snapshot);
                })
            );
        }

        return res.status(200).json({ room });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const updateConversationWallpaper = async (req, res) => {
    try {
        const room = await roomService.updateConversationWallpaper(
            req.user.sub,
            req.params.conversationId,
            req.body?.wallpaperId,
        );

        const io = req.app.get('io');

        if (io && room?.id) {
            const participantUserIds = [req.user.sub, room.peer?.id].filter(Boolean);

            await Promise.allSettled(
                participantUserIds.map(async (participantUserId) => {
                    const snapshot = await roomService.ensureRoomAccess(participantUserId, room.id);
                    io.to(`user:${participantUserId}`).emit('conversation:updated', snapshot);
                })
            );
        }

        return res.status(200).json({ room });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

module.exports = {
    createDirectRoom,
    createFriendRequest,
    listCalls,
    listFriends,
    listPendingFriendRequests,
    listRooms,
    searchUsers,
    updateConversationWallpaper,
    updateParticipantNickname,
};
