const { createClient } = require('redis');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    connectTimeout: 500,
    reconnectStrategy: (retries) => {
      if (process.env.NODE_ENV === 'test') {
        return new Error('Redis connection failed in test environment');
      }
      return Math.min(retries * 50, 500);
    }
  }
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Redis Client Error', err);
  }
});

module.exports = redis;
