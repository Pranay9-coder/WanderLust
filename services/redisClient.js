const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const client = createClient({
    url: redisUrl,
    RESP: 2,
    socket: {
        reconnectStrategy: false,
    },
});

let connectionAttempt;
let redisAvailable = false;
let loggedUnavailable = false;

client.on("ready", () => {
    redisAvailable = true;
    loggedUnavailable = false;
    console.log("Redis cache is ready");
});

client.on("end", () => {
    redisAvailable = false;
});

client.on("error", (error) => {
    redisAvailable = false;
    if (!loggedUnavailable) {
        loggedUnavailable = true;
        console.warn(`Redis cache unavailable; continuing without cache (${error.message})`);
    }
});

async function connectRedis() {
    if (connectionAttempt) return connectionAttempt;

    connectionAttempt = client.connect().catch(() => {
        redisAvailable = false;
        return false;
    });

    return connectionAttempt;
}

async function getJson(key) {
    await connectRedis();
    if (!redisAvailable) return null;

    try {
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        redisAvailable = false;
        return null;
    }
}

async function setJson(key, value, ttlSeconds = 60) {
    await connectRedis();
    if (!redisAvailable) return false;

    try {
        await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
        return true;
    } catch (error) {
        redisAvailable = false;
        return false;
    }
}

async function deleteKey(key) {
    await connectRedis();
    if (!redisAvailable) return false;

    try {
        await client.del(key);
        return true;
    } catch (error) {
        redisAvailable = false;
        return false;
    }
}

async function invalidateByPrefix(prefix) {
    await connectRedis();
    if (!redisAvailable) return 0;

    let deleted = 0;
    try {
        for await (const key of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
            deleted += await client.del(key);
        }
    } catch (error) {
        redisAvailable = false;
    }

    return deleted;
}

function isRedisAvailable() {
    return redisAvailable;
}

module.exports = {
    connectRedis,
    getJson,
    setJson,
    deleteKey,
    invalidateByPrefix,
    isRedisAvailable,
};
