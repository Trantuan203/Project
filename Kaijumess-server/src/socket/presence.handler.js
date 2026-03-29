const pool = require('../config/db');

module.exports = (io, socket) => {
    // User online
    socket.on('presence:online', async () => {
        await pool.query(
            `UPDATE users SET status = 'online', last_seen = NOW() WHERE id = $1`,
            [socket.user.id]
        );
        io.emit('presence:update', { userId: socket.user.id, status: 'online' });
    });

    // User disconnect
    socket.on('disconnect', async () => {
        await pool.query(
            `UPDATE users SET status = 'offline', last_seen = NOW() WHERE id = $1`,
            [socket.user.id]
        );
        io.emit('presence:update', { userId: socket.user.id, status: 'offline' });
        console.log(`🔌 User disconnected: ${socket.user.id}`);
    });
};