import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { RedisModule } from '../../redis/redis.module';
import { Player, PlayerSchema } from '../players/schemas/player.schema';
import { Season, SeasonSchema } from '../seasons/schemas/season.schema';

import { LeaderboardScore, LeaderboardScoreSchema } from './schemas/leaderboard-score.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Season.name, schema: SeasonSchema },
      { name: LeaderboardScore.name, schema: LeaderboardScoreSchema },
    ]),
    RedisModule,
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
