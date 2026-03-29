const { createClient } = require('redis');

const getRedisOptions = () => {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        return null;
    }

    try {
        const parsedUrl = new URL(redisUrl);
        const options = { url: redisUrl };

        if (parsedUrl.protocol === 'rediss:') {
            options.socket = {
                tls: true,
                rejectUnauthorized: false,
            };
        }

        return options;
    } catch {
        console.error('Invalid REDIS_URL. Redis features are disabled.');
        return null;
    }
};

const hasRedisConfig = () => Boolean(getRedisOptions());

const attachRedisLogging = (client, label) => {
    client.on('error', (error) => {
        console.error(`Redis ${label} error:`, error.message || error);
    });

    client.on('connect', () => {
        console.log(`Redis ${label} connected.`);
    });
};

const createRedisConnection = (label = 'client') => {
    const options = getRedisOptions();

    if (!options) {
        return null;
    }

    const client = createClient(options);
    attachRedisLogging(client, label);
    return client;
};

let cacheClientPromise = null;

const getRedisClient = async () => {
    if (!cacheClientPromise) {
        const client = createRedisConnection('cache');

        if (!client) {
            return null;
        }

        cacheClientPromise = client.connect()
            .then(() => client)
            .catch((error) => {
                console.error(
                    'Redis cache unavailable. Continuing without cache.',
                    error.message || error
                );
                cacheClientPromise = null;

                try {
                    client.destroy();
                } catch {
                    // Ignore cleanup errors after a failed connect attempt.
                }

                return null;
            });
    }

    return cacheClientPromise;
};

module.exports = {
    createRedisConnection,
    getRedisClient,
    hasRedisConfig,
};
