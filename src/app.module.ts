import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { PlayersModule } from './modules/players/players.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { SeasonsModule } from './modules/seasons/seasons.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RedisModule,
    LeaderboardModule,
    PlayersModule,
    SeasonsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
