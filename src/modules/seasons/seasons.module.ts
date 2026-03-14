import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeasonsService } from './seasons.service';
import { SeasonsController } from './seasons.controller';
import { Season, SeasonSchema } from './schemas/season.schema';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Season.name, schema: SeasonSchema }]),
    RedisModule,
  ],
  controllers: [SeasonsController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
