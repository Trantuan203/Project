const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createRedisConnection, hasRedisConfig } = require('../config/redis');
const { getAllowedOrigins } = require('../config/origins');
const { verifyToken } = require('../middlewares/auth.middleware');
const chatHandler = require('./chat.handler');
const presenceHandler = require('./presence.handler');
const callHandler = require('./call.handler');

const closeRedisConnection = async (client) => {
    if (!client) {
        return;
    }

    try {
        if (client.isOpen) {
            await client.quit();
            return;
        }

        client.destroy();
    } catch {
        // Ignore cleanup failures when falling back without Redis.
    }
};

const attachRedisAdapter = async (io) => {
    if (!hasRedisConfig()) {
        console.warn('REDIS_URL is missing. Socket.io will run without Redis adapter.');
        return;
    }

    const pubClient = createRedisConnection('adapter pub');

    if (!pubClient) {
        console.warn('Redis configuration is invalid. Socket.io will run without Redis adapter.');
        return;
    }

    const subClient = pubClient.duplicate();

    try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.io Redis adapter connected.');
    } catch (error) {
        console.warn(
            'Socket.io Redis adapter unavailable. Continuing without Redis adapter.',
            error.message || error
        );
        await Promise.all([closeRedisConnection(pubClient), closeRedisConnection(subClient)]);
    }
};

const initSocket = async (server) => {
    const allowedOrigins = getAllowedOrigins();
    const io = new Server(server, {
        cors: {
            methods: ['GET', 'POST'],
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }

                callback(new Error('Origin not allowed by Socket.io CORS.'));
            },
        },
    });

    await attachRedisAdapter(io);

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('No token'));
        }

        try {
            const payload = verifyToken(token);
            socket.user = {
                ...payload,
                id: payload.sub,
            };
            return next();
        } catch {
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.user.id}`);
        socket.join(`user:${socket.user.id}`);
        chatHandler(io, socket);
        presenceHandler(io, socket);
        callHandler(io, socket);
    });

    return io;
};

module.exports = initSocket;
