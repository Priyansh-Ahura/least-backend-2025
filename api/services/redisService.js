// redisService.js
const redis = require('redis');
const config = require('../../config')
const { promisify } = require('util');

// Create Redis client
// const client = redis.createClient({
//   host: 'localhost',
//   port: 6379,
//   password: 'new_secure_passwor'
// });

const client = redis.createClient({
  url: `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`
});

client.connect()
  .then(() => console.log('Connected to Redis'))
  .catch((err) => console.error('Redis connection error:', err));

const get = async (key) => {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null; // Assuming the data is stored as JSON string
  } catch (err) {
    console.error('Error getting data from Redis:', err);
    throw err;
  }
};

const setData = async (key, data) => {
  try {
    await client.set(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error setting data in Redis:', err);
    throw err;
  }
};

const deleteData = async (key) => {
  try {
    const result = await client.del(key);
    return result > 0;
  } catch (err) {
    console.error('Error deleting data from Redis:', err);
    throw err;
  }
};

module.exports = { setData, get, deleteData };
