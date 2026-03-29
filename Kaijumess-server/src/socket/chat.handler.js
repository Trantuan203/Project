const { getRedisClient } = require('../config/redis');
const messageService = require('../services/message.service');
const roomService = require('../services/room.service');

module.exports = (io, socket) => {
    socket.on('join:room', async (conversationId) => {
        try {
            await roomService.ensureRoomAccess(socket.user.id, conversationId);
            socket.join(conversationId);
        } catch (error) {
            socket.emit('error', { message: error.message || 'Khong the vao cuoc tro chuyen nay.' });
        }
    });

    socket.on('message:send', async (data) => {
        const { clientMessageId, content, conversationId, metadata, type = 'text' } = data || {};

        try {
            await roomService.ensureRoomAccess(socket.user.id, conversationId);

            const message = await messageService.createMessage({
                clientMessageId,
                content,
                conversationId,
                metadata,
                type,
                userId: socket.user.id,
            });

            try {
                const redisClient = await getRedisClient();

                if (redisClient) {
                    await redisClient.lPush(`messages:${conversationId}`, JSON.stringify(message));
                    await redisClient.lTrim(`messages:${conversationId}`, 0, 49);
                }
            } catch (error) {
                console.warn('Redis message cache write failed.', error.message || error);
            }

            io.to(conversationId).emit('message:new', message);
        } catch (error) {
            socket.emit('error', { message: error.message || 'Gui tin nhan that bai' });
        }
    });

    socket.on('typing:start', async (conversationId) => {
        try {
            await roomService.ensureRoomAccess(socket.user.id, conversationId);
            socket.to(conversationId).emit('typing:start', { conversationId, userId: socket.user.id });
        } catch {
            // Ignore invalid typing events for rooms the socket does not belong to.
        }
    });

    socket.on('typing:stop', async (conversationId) => {
        try {
            await roomService.ensureRoomAccess(socket.user.id, conversationId);
            socket.to(conversationId).emit('typing:stop', { conversationId, userId: socket.user.id });
        } catch {
            // Ignore invalid typing events for rooms the socket does not belong to.
        }
    });
};
