import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player } from '../players/schemas/player.schema';
import { Season } from '../seasons/schemas/season.schema';
import { LeaderboardScore } from './schemas/leaderboard-score.schema';

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  SEASON = 'season',
  ALL_TIME = 'all',
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private readonly BASE_KEY = 'leaderboard';

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(Player.name) private playerModel: Model<Player>,
    @InjectModel(Season.name) private seasonModel: Model<Season>,
    @InjectModel(LeaderboardScore.name) private scoreModel: Model<LeaderboardScore>,
  ) { }

  /**
   * Sinh Identifier động dựa trên chu kỳ và thời gian
   */
  getIdentifier(period: LeaderboardPeriod, date: Date = new Date(), seasonId?: string): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');

    switch (period) {
      case LeaderboardPeriod.DAILY:
        return `${y}-${m}-${d}`;
      case LeaderboardPeriod.WEEKLY:
        // Lấy ngày đầu tuần (Thứ 2)
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return `w:${monday.getFullYear()}-${(monday.getMonth() + 1).toString().padStart(2, '0')}-${monday.getDate().toString().padStart(2, '0')}`;
      case LeaderboardPeriod.MONTHLY:
        return `${y}-${m}`;
      case LeaderboardPeriod.YEARLY:
        return `${y}`;
      case LeaderboardPeriod.SEASON:
        return seasonId || 'current';
      case LeaderboardPeriod.ALL_TIME:
      default:
        return 'all';
    }
  }

  /**
   * Tạo Redis Key chuẩn hóa
   */
  getLbKey(period: LeaderboardPeriod, identifier: string): string {
    return `${this.BASE_KEY}:score:${period}:${identifier}`;
  }

  /**
   * Cập nhật điểm cho nhiều chu kỳ cùng lúc (Atomic)
   * Ví dụ: Cập nhật điểm Season thì tự động vào Daily và Weekly
   */
  async addScoreDynamic(params: {
    playerId: string;
    score: number;
    periods: LeaderboardPeriod[];
    seasonId?: string;
  }) {
    const { playerId, score, periods, seasonId } = params;
    const now = new Date();
    const pipeline = this.redisService.pipeline();

    for (const period of periods) {
      const identifier = this.getIdentifier(period, now, seasonId);
      const key = this.getLbKey(period, identifier);
      pipeline.zincrby(key, score, playerId);

      // ĐỒNG BỘ VÀO MONGODB THEO CHU KỲ (PERIOD)
      // Sử dụng upsert: true để tự động tạo bản ghi mới nếu chưa có cho chu kỳ này
      await this.scoreModel.findOneAndUpdate(
        { playerId, period, identifier },
        { $inc: { score: score } },
        { upsert: true, new: true }
      ).exec();

      // Nếu là Season, có thể set thêm TTL hoặc logic kiểm tra threshold ở đây
      if (period === LeaderboardPeriod.SEASON && seasonId) {
        await this.checkSeasonThreshold(seasonId, score);
      }
    }

    await pipeline.exec();

    // Đồng bộ vào MongoDB (Tổng điểm All-time của Player)
    await this.playerModel.findByIdAndUpdate(playerId, { $inc: { score: score } });
  }

  /**
   * Logic kiểm tra mốc (Threshold) để đóng Season
   */
  private async checkSeasonThreshold(seasonId: string, addedScore: number) {
    const metaKey = `${this.BASE_KEY}:score:season:${seasonId}:meta`;

    // 1. Kiểm tra trạng thái hiện tại trong Redis xem còn ACTIVE không
    const status = await this.redisService.hGet(metaKey, 'status');
    if (status && status !== 'ACTIVE') return;

    // 2. Tăng điểm và lấy cấu hình Target
    const targetStr = await this.redisService.hGet(metaKey, 'targetScore');
    const targetScore = parseInt(targetStr, 10) || 0;
    const currentTotal = await this.redisService.hIncrBy(metaKey, 'totalScore', addedScore);

    let shouldClose = false;

    // 3. Kiểm tra mốc điểm (Target Score)
    if (targetScore > 0 && currentTotal >= targetScore) {
      shouldClose = true;
      this.logger.log(`Season ${seasonId} reached threshold (${currentTotal}/${targetScore}). Closing...`);
    } else {
      // 4. Nếu chưa đủ điểm, kiểm tra thời gian hết hạn (Time)
      const season = await this.seasonModel.findById(seasonId);
      if (season) {
        if (new Date() >= season.endTime) {
          shouldClose = true;
          this.logger.log(`Season ${seasonId} reached end time. Closing...`);
        }
      }
    }

    if (shouldClose) {
      await this.closeSeason(seasonId);
    }
  }

  /**
   * Đóng Season và có thể mở Season mới
   */
  async closeSeason(seasonId: string) {
    const metaKey = `${this.BASE_KEY}:score:season:${seasonId}:meta`;

    // Lấy lock để tránh MỞ 2 SEASON cùng lúc ở môi trường cluster
    const lockKey = `score:season_lock:${seasonId}`;
    const acquired = await this.redisService.lock(lockKey, 30);
    if (!acquired) return; // Một process khác đã xử lý close

    try {
      // 1. Cập nhật Status vào Redis để block các Request ghi điểm khác
      await this.redisService.hSet(metaKey, 'status', 'CLOSED');
      await this.redisService.hSet(metaKey, 'closedAt', new Date().toISOString());

      // 2. Cập nhật Status trong MongoDB
      await this.seasonModel.findByIdAndUpdate(seasonId, { status: 'CLOSED' });
      this.logger.warn(`LEADERBOARD: Season ${seasonId} for score is now CLOSED.`);

      // 3. Tự động kiểm tra và KÍCH HOẠT QUAY VÒNG SANG SEASON KẾ TIẾP (PENDING status) DỰA TRÊN CÙNG TYPE
      const nextSeason = await this.seasonModel.findOne({ status: 'PENDING', type: 'score' }).sort({ startTime: 1 });

      if (nextSeason) {
        this.logger.log(`Activating next season: [${nextSeason.name}] (ID: ${nextSeason._id})`);
        nextSeason.status = 'ACTIVE';
        await nextSeason.save();

        // 4. Setup Redis Dictionary cho Season Mới
        const nextMetaKey = `${this.BASE_KEY}:score:season:${nextSeason._id.toString()}:meta`;
        await this.redisService.hSet(nextMetaKey, 'status', 'ACTIVE');
        await this.redisService.hIncrBy(nextMetaKey, 'targetScore', nextSeason.targetScore);
        await this.redisService.hIncrBy(nextMetaKey, 'totalScore', nextSeason.currentScore);
      } else {
        this.logger.log('No PENDING season found to transition to!');
      }
    } catch (e) {
      this.logger.error(`Error closing season ${seasonId}: ${e.message}`);
    } finally {
      // Tháo khoá
      await this.redisService.unlock(lockKey);
    }
  }

  /**
   * Lấy Bảng xếp hạng linh hoạt
   */
  async getLeaderboard(params: {
    period: LeaderboardPeriod;
    identifier?: string;
    limit?: number;
    userId?: string;
  }) {
    const { period, identifier, limit = 10, userId } = params;
    const currentId = identifier || this.getIdentifier(period);
    const key = this.getLbKey(period, currentId);

    // Lấy Top từ Redis
    const topData = await this.redisService.zrevrange(key, 0, limit - 1, true) as any[];

    const formatted = await Promise.all(topData.map(async (item, index) => {
      // Tận dụng userInfoKey từ Redis (giống logic Pocket Offer của bạn)
      const userInfoKey = `${this.BASE_KEY}:userInfo`;
      const cachedInfo = await this.redisService.hGet(userInfoKey, item.member);

      return {
        rank: index + 1,
        playerId: item.member,
        score: item.score,
        user: cachedInfo || { id: item.member, name: 'Unknown' }
      };
    }));

    let userRanking = null;
    if (userId) {
      const rank = await this.redisService.zrevrank(key, userId);
      const score = await this.redisService.zscore(key, userId);
      userRanking = {
        rank: rank !== null ? rank + 1 : null,
        score: score || 0
      };
    }

    return {
      type: 'score',
      period,
      identifier: currentId,
      leaderboard: formatted,
      userRanking
    };
  }
}
