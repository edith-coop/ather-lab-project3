import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { Season } from '../src/modules/seasons/schemas/season.schema';
import { getModelToken } from '@nestjs/mongoose';
import { RedisService } from '../src/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seasonModel = app.get<Model<Season>>(getModelToken(Season.name));
  const redisService = app.get<RedisService>(RedisService);

  console.log('Clearing old mocked seasons from MongoDB...');
  await seasonModel.deleteMany({});

  console.log('Clearing old season meta from Redis...');
  const keys = await redisService.keys('leaderboard:score:season:*');
  if (keys.length > 0) {
    for (const key of keys) {
      await redisService.del(key);
    }
  }

  const now = new Date();

  // Create 4 distinct test seasons manually bypassing constraints for DB seeding
  const mockSeasons = [
    {
      name: 'Mùa Cuối Năm 2025 (Finished)',
      startTime: new Date(now.getFullYear() - 1, 10, 1),
      endTime: new Date(now.getFullYear() - 1, 11, 31),
      targetScore: 50000,
      status: 'CLOSED',
      currentScore: 50000
    },
    {
      name: 'Mùa Valentine 2026 (Finished)',
      startTime: new Date(now.getFullYear(), 0, 15),
      endTime: new Date(now.getFullYear(), 1, 28),
      targetScore: 20000,
      status: 'CLOSED',
      currentScore: 20000
    },
    {
      name: 'Mùa Hè Sinh Tử 2026 (ACTIVE NOW)',
      startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5), // Started 5 days ago
      endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),  // Ends in 30 days
      targetScore: 150000,
      status: 'ACTIVE',
      currentScore: 0
    },
    {
      name: 'Mùa Halloween Kinh Dị 2026 (Upcoming)',
      startTime: new Date(now.getFullYear(), 9, 1),
      endTime: new Date(now.getFullYear(), 9, 31),
      targetScore: 75000,
      status: 'PENDING',
      currentScore: 0
    }
  ];

  for (const s of mockSeasons) {
    try {
      const newSeason = new seasonModel(s);
      await newSeason.save();

      // Configure redis matching meta data for ACTIVE season
      if (s.status === 'ACTIVE') {
        const metaKey = `leaderboard:score:season:${newSeason._id.toString()}:meta`;
        await redisService.hSet(metaKey, 'status', 'ACTIVE');
        await redisService.hIncrBy(metaKey, 'targetScore', s.targetScore);
        await redisService.hIncrBy(metaKey, 'totalScore', s.currentScore);
      }
      console.log(`✅ Created: [${s.status}] ${s.name}`);
    } catch (e) {
      console.error(`❌ Error creating ${s.name}:`, e.message);
    }
  }

  console.log('🎊 4 mock seasons setup fully completed!');
  await app.close();
}
bootstrap();
