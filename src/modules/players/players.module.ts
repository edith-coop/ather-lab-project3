import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { Player, PlayerSchema } from './schemas/player.schema';
import { RedisModule } from '../../redis/redis.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { SeasonsModule } from '../seasons/seasons.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Player.name, schema: PlayerSchema }]),
    RedisModule,
    LeaderboardModule,
    SeasonsModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule { }
