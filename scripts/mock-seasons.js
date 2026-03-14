"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const season_schema_1 = require("../src/modules/seasons/schemas/season.schema");
const mongoose_1 = require("@nestjs/mongoose");
const redis_service_1 = require("../src/redis/redis.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const seasonModel = app.get((0, mongoose_1.getModelToken)(season_schema_1.Season.name));
    const redisService = app.get(redis_service_1.RedisService);
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
            startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
            endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
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
            if (s.status === 'ACTIVE') {
                const metaKey = `leaderboard:score:season:${newSeason._id.toString()}:meta`;
                await redisService.hSet(metaKey, 'status', 'ACTIVE');
                await redisService.hIncrBy(metaKey, 'targetScore', s.targetScore);
                await redisService.hIncrBy(metaKey, 'totalScore', s.currentScore);
            }
            console.log(`✅ Created: [${s.status}] ${s.name}`);
        }
        catch (e) {
            console.error(`❌ Error creating ${s.name}:`, e.message);
        }
    }
    console.log('🎊 4 mock seasons setup fully completed!');
    await app.close();
}
bootstrap();
//# sourceMappingURL=mock-seasons.js.map