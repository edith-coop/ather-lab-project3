import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Season } from './schemas/season.schema';
import { CreateSeasonDto } from './dto/create-season.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SeasonsService {
  private readonly logger = new Logger(SeasonsService.name);

  constructor(
    @InjectModel(Season.name) private seasonModel: Model<Season>,
    private readonly redisService: RedisService,
  ) { }

  async create(createSeasonDto: CreateSeasonDto): Promise<Season> {
    const { name, startTime, endTime, targetScore } = createSeasonDto;

    // Check if there's any currently active season for score
    const activeSeason = await this.seasonModel.findOne({ status: 'ACTIVE', type: 'score' });
    if (activeSeason) {
      throw new BadRequestException(`There is already an active season for score: ${activeSeason.name}`);
    }

    const season = new this.seasonModel({
      name,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      targetScore: targetScore || 0,
      currentScore: 0,
      type: 'score',
      status: 'ACTIVE',
    });

    const savedSeason = await season.save();

    // Set meta info to Redis so Leaderboard can check it quickly
    const metaKey = `leaderboard:score:season:${savedSeason._id.toString()}:meta`;
    await this.redisService.hSet(metaKey, 'status', 'ACTIVE');
    await this.redisService.hIncrBy(metaKey, 'targetScore', savedSeason.targetScore);
    await this.redisService.hIncrBy(metaKey, 'totalScore', 0);

    return savedSeason;
  }

  async findAll(): Promise<Season[]> {
    return this.seasonModel.find().sort({ createdAt: -1 }).exec();
  }

  async getActiveSeason(): Promise<Season | null> {
    const now = new Date();
    // Check ACTIVE status and if end time is still in the future for score
    return this.seasonModel.findOne({
      status: 'ACTIVE',
      type: 'score',
      endTime: { $gt: now },
    }).exec();
  }

  async addPointsToSeason(seasonId: string, points: number): Promise<Season> {
    const season = await this.seasonModel.findById(seasonId);
    if (!season) throw new NotFoundException('Season not found');

    const updated = await this.seasonModel.findByIdAndUpdate(
      seasonId,
      { $inc: { currentScore: points } },
      { new: true }
    );

    if (updated && updated.targetScore > 0 && updated.currentScore >= updated.targetScore) {
      this.logger.log(`Season ${seasonId} reached target score (${updated.currentScore}/${updated.targetScore}). Auto-closing...`);
      // Auto close season when threshold reached
      // return this.closeSeason(seasonId);
    }

    return updated as Season;
  }

  async closeSeason(id: string): Promise<Season> {
    const season = await this.seasonModel.findById(id);
    if (!season) throw new NotFoundException('Season not found');

    season.status = 'CLOSED';
    const closedSeason = await season.save();

    const metaKey = `leaderboard:${season.type}:season:${id}:meta`;
    await this.redisService.hSet(metaKey, 'status', 'CLOSED');
    await this.redisService.hSet(metaKey, 'closedAt', new Date().toISOString());

    return closedSeason;
  }
}
