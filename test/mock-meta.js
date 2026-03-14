require('dotenv').config();

const Redis = require('ioredis');
const { MongoClient } = require('mongodb');

async function setupRedis() {
  const redisUrl = process.env.REDIS_URL;
  const dbUri = process.env.MONGODB_URI;
  
  const redisClient = new Redis(redisUrl);
  const mongoClient = new MongoClient(dbUri);

  try {
    await mongoClient.connect();
    const db = mongoClient.db('nest_project'); // Try different DB naming
    
    // Fallback if the default DB is named 'test' or others
    let activeSeason = await mongoClient.db('test').collection('seasons').findOne({ status: 'ACTIVE' });

    if (activeSeason) {
      const metaKey = `leaderboard:point:season:${activeSeason._id.toString()}:meta`;
      await redisClient.hset(metaKey, 'status', 'ACTIVE');
      await redisClient.hset(metaKey, 'targetScore', '150000');
      await redisClient.hset(metaKey, 'totalScore', '12050');
      console.log('✅ Active Season Meta injected into Redis');
    } else {
      console.log('No ACTIVE season found to inject into Redis.');
    }
  } catch (err) {
    console.error('Error in Redis mock process:', err);
  } finally {
    await mongoClient.close();
    await redisClient.quit();
  }
}

setupRedis();
