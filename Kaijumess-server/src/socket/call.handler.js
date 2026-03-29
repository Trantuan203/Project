const axios = require('axios');
const pool = require('../config/db');
const roomService = require('../services/room.service');

const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

const FINAL_CALL_STATUSES = new Set(['busy', 'ended', 'missed', 'rejected']);
const SUPPORTED_CALL_TYPES = new Set(['audio', 'video']);

const createCallError = (message, code = 'CALL_ERROR', statusCode = 400) => {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
};

const emitCallError = (socket, error, fallbackMessage) => {
    socket.emit('call:error', {
        code: error?.code || 'CALL_ERROR',
        message: error?.message || fallbackMessage,
    });
};

const getIceServers = async () => {
    if (!process.env.METERED_DOMAIN || !process.env.METERED_API_KEY) {
        return DEFAULT_ICE_SERVERS;
    }

    try {
        const { data } = await axios.get(
            `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials`,
            {
                params: {
                    apiKey: process.env.METERED_API_KEY,
                },
                timeout: 5000,
            }
        );

        return Array.isArray(data) && data.length > 0 ? data : DEFAULT_ICE_SERVERS;
    } catch (error) {
        console.warn('Metered ICE lookup failed. Falling back to public STUN.', error.message || error);
        return DEFAULT_ICE_SERVERS;
    }
};

const createCallRecord = async ({ conversationId, initiatedBy, type }) => {
    const { rows } = await pool.query(
        `
            INSERT INTO calls (conversation_id, initiated_by, type, status)
            VALUES ($1, $2, $3, 'calling')
            RETURNING *
        `,
        [conversationId, initiatedBy, type]
    );

    return rows[0] || null;
};

const markCallAccepted = async ({ answeredBy, callId }) => {
    const { rows } = await pool.query(
        `
            UPDATE calls
            SET status = 'ongoing',
                answered_at = COALESCE(answered_at, NOW()),
                answered_by = COALESCE(answered_by, $2)
            WHERE id = $1
              AND status = 'calling'
            RETURNING *
        `,
        [callId, answeredBy]
    );

    return rows[0] || null;
};

const markCallFinalStatus = async ({ callId, endedBy = null, status }) => {
    if (!FINAL_CALL_STATUSES.has(status)) {
        throw createCallError('Unsupported final call status.', 'INVALID_CALL_STATUS');
    }

    const allowedSourceStatuses = status === 'ended' ? ['calling', 'ongoing'] : ['calling'];

    const { rows } = await pool.query(
        `
            UPDATE calls
            SET status = $2,
                ended_at = COALESCE(ended_at, NOW()),
                ended_by = COALESCE($3, ended_by),
                duration_seconds = CASE
                    WHEN answered_at IS NULL THEN NULL
                    ELSE EXTRACT(EPOCH FROM (NOW() - answered_at))::int
                END
            WHERE id = $1
              AND status = ANY($4::text[])
            RETURNING *
        `,
        [callId, status, endedBy, allowedSourceStatuses]
    );

    return rows[0] || null;
};

const ensureDirectConversation = async ({ conversationId, peerId, userId }) => {
    const room = await roomService.ensureRoomAccess(userId, conversationId);

    if (!room.isDirect || room.peer?.id !== peerId) {
        throw createCallError(
            'Audio and video call currently support direct conversations only.',
            'CALL_DIRECT_ONLY',
            403
        );
    }

    return room;
};

const ensureIdleSocket = (socket) => {
    if (socket.data.activeCall) {
        throw createCallError('You are already in another call.', 'CALL_ALREADY_ACTIVE', 409);
    }
};

const ensureSocketCallMatch = (socket, { callId, conversationId, peerId }) => {
    const activeCall = socket.data.activeCall;

    if (
        !activeCall ||
        activeCall.callId !== callId ||
        activeCall.conversationId !== conversationId ||
        activeCall.peerId !== peerId
    ) {
        throw createCallError('Call session no longer matches this socket.', 'CALL_CONTEXT_MISMATCH', 409);
    }

    return activeCall;
};

const setSocketActiveCall = (socket, nextValue) => {
    socket.data.activeCall = nextValue;
};

const clearSocketActiveCall = (socket, callId = null) => {
    if (!callId || socket.data.activeCall?.callId === callId) {
        delete socket.data.activeCall;
    }
};

module.exports = (io, socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on('call:start', async ({ conversationId, receiverId, type }) => {
        try {
            if (!SUPPORTED_CALL_TYPES.has(type)) {
                throw createCallError('Unsupported call type.', 'INVALID_CALL_TYPE');
            }

            if (!conversationId || !receiverId) {
                throw createCallError('conversationId and receiverId are required.', 'CALL_TARGET_REQUIRED');
            }

            ensureIdleSocket(socket);
            await ensureDirectConversation({
                conversationId,
                peerId: receiverId,
                userId: socket.user.id,
            });

            const call = await createCallRecord({
                conversationId,
                initiatedBy: socket.user.id,
                type,
            });
            const iceServers = await getIceServers();

            setSocketActiveCall(socket, {
                callId: call.id,
                conversationId,
                peerId: receiverId,
                phase: 'calling',
                type,
            });

            socket.emit('call:started', {
                callId: call.id,
                conversationId,
                iceServers,
                receiverId,
                type,
            });

            io.to(`user:${receiverId}`).emit('call:incoming', {
                callId: call.id,
                callerId: socket.user.id,
                conversationId,
                iceServers,
                type,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not start the call.');
        }
    });

    socket.on('call:ringing', ({ callId, callerId, conversationId }) => {
        io.to(`user:${callerId}`).emit('call:ringing', {
            by: socket.user.id,
            callId,
            conversationId,
        });
    });

    socket.on('call:accept', async ({ callId, callerId, conversationId }) => {
        try {
            ensureIdleSocket(socket);
            await ensureDirectConversation({
                conversationId,
                peerId: callerId,
                userId: socket.user.id,
            });

            const call = await markCallAccepted({
                answeredBy: socket.user.id,
                callId,
            });

            if (!call) {
                throw createCallError('Call was not found.', 'CALL_NOT_FOUND', 404);
            }

            setSocketActiveCall(socket, {
                callId,
                conversationId,
                peerId: callerId,
                phase: 'ongoing',
                type: call.type,
            });

            io.to(`user:${callerId}`).emit('call:accepted', {
                answeredBy: socket.user.id,
                callId,
                conversationId,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not accept the call.');
        }
    });

    socket.on('call:reject', async ({ callId, callerId, conversationId }) => {
        try {
            await ensureDirectConversation({
                conversationId,
                peerId: callerId,
                userId: socket.user.id,
            });

            const call = await markCallFinalStatus({
                callId,
                endedBy: socket.user.id,
                status: 'rejected',
            });

            if (!call) {
                throw createCallError('Call was not found.', 'CALL_NOT_FOUND', 404);
            }

            clearSocketActiveCall(socket, callId);

            io.to(`user:${callerId}`).emit('call:rejected', {
                by: socket.user.id,
                callId,
                conversationId,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not reject the call.');
        }
    });

    socket.on('call:busy', async ({ callId, callerId, conversationId }) => {
        try {
            await ensureDirectConversation({
                conversationId,
                peerId: callerId,
                userId: socket.user.id,
            });

            const call = await markCallFinalStatus({
                callId,
                endedBy: socket.user.id,
                status: 'busy',
            });

            if (!call) {
                throw createCallError('Call was not found.', 'CALL_NOT_FOUND', 404);
            }

            clearSocketActiveCall(socket, callId);

            io.to(`user:${callerId}`).emit('call:busy', {
                by: socket.user.id,
                callId,
                conversationId,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not mark the call as busy.');
        }
    });

    socket.on('call:offer', ({ callId, conversationId, offer, to }) => {
        try {
            ensureSocketCallMatch(socket, {
                callId,
                conversationId,
                peerId: to,
            });

            io.to(`user:${to}`).emit('call:offer', {
                callId,
                conversationId,
                from: socket.user.id,
                offer,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not forward the call offer.');
        }
    });

    socket.on('call:answer', ({ answer, callId, conversationId, to }) => {
        try {
            ensureSocketCallMatch(socket, {
                callId,
                conversationId,
                peerId: to,
            });

            io.to(`user:${to}`).emit('call:answer', {
                answer,
                callId,
                conversationId,
                from: socket.user.id,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not forward the call answer.');
        }
    });

    socket.on('call:ice', ({ callId, candidate, conversationId, to }) => {
        try {
            ensureSocketCallMatch(socket, {
                callId,
                conversationId,
                peerId: to,
            });

            io.to(`user:${to}`).emit('call:ice', {
                callId,
                candidate,
                conversationId,
                from: socket.user.id,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not forward ICE candidate.');
        }
    });

    socket.on('call:end', async ({ callId, conversationId, peerId }) => {
        try {
            await ensureDirectConversation({
                conversationId,
                peerId,
                userId: socket.user.id,
            });

            const call = await markCallFinalStatus({
                callId,
                endedBy: socket.user.id,
                status: 'ended',
            });

            if (!call) {
                throw createCallError('Call was not found.', 'CALL_NOT_FOUND', 404);
            }

            clearSocketActiveCall(socket, callId);

            io.to(`user:${peerId}`).emit('call:ended', {
                by: socket.user.id,
                callId,
                conversationId,
            });
        } catch (error) {
            emitCallError(socket, error, 'Could not end the call.');
        }
    });

    socket.on('disconnect', async () => {
        const activeCall = socket.data.activeCall;

        if (!activeCall?.callId) {
            return;
        }

        try {
            await markCallFinalStatus({
                callId: activeCall.callId,
                endedBy: socket.user.id,
                status: 'ended',
            });

            io.to(`user:${activeCall.peerId}`).emit('call:ended', {
                by: socket.user.id,
                callId: activeCall.callId,
                conversationId: activeCall.conversationId,
            });
        } catch (error) {
            console.warn('Call disconnect cleanup failed.', error.message || error);
        } finally {
            clearSocketActiveCall(socket, activeCall.callId);
        }
    });
};
