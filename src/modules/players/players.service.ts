import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player } from './schemas/player.schema';
import { RedisService } from '../../redis/redis.service';
import { LeaderboardService, LeaderboardPeriod } from '../leaderboard/leaderboard.service';
import { SeasonsService } from '../seasons/seasons.service';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<Player>,
    private readonly redisService: RedisService,
    private readonly leaderboardService: LeaderboardService,
    private readonly seasonsService: SeasonsService,
  ) { }

  async create(name: string, periodsInput?: string[]): Promise<Player> {
    const newPlayer = new this.playerModel({ name });
    const savedPlayer = await newPlayer.save();

    // Lưu thông tin user vào cache Hash cho Leaderboard mapping nhanh
    await this.redisService.hSet('leaderboard:userInfo', savedPlayer.id, {
      id: savedPlayer.id,
      name: savedPlayer.name,
    });

    await this.syncToLeaderboard(savedPlayer.id, 0, periodsInput);

    return savedPlayer;
  }

  async update(id: string, name: string): Promise<Player> {
    const updatedPlayer = await this.playerModel.findByIdAndUpdate(
      id,
      { name },
      { new: true },
    );

    if (!updatedPlayer) {
      throw new NotFoundException('Player not found');
    }

    // Cập nhật thông tin user trong cache Hash cho Leaderboard
    await this.redisService.hSet('leaderboard:userInfo', id, {
      id: updatedPlayer.id,
      name: updatedPlayer.name,
    });

    return updatedPlayer;
  }

  private async syncToLeaderboard(playerId: string, scoreDelta: number, periodsInput?: string[]) {
    const periods = periodsInput && periodsInput.length > 0
      ? (periodsInput as LeaderboardPeriod[])
      : Object.values(LeaderboardPeriod);

    let seasonId = undefined;

    if (periods.includes(LeaderboardPeriod.SEASON)) {
      const activeSeason = await this.seasonsService.getActiveSeason();
      if (activeSeason) {
        seasonId = activeSeason._id.toString();
        // Chỉ cộng điểm vào Season nếu delta != 0 (tránh loop khởi tạo 0 điểm)
        if (scoreDelta !== 0) {
          await this.seasonsService.addPointsToSeason(seasonId, scoreDelta);
        }
      }
    }

    // Sync thay đổi score vào Leaderboard linh hoạt
    await this.leaderboardService.addScoreDynamic({
      playerId,
      score: scoreDelta,
      periods,
      seasonId,
    });
  }

  async incrementScore(
    id: string,
    increment: number,
    periodsInput?: string[]
  ): Promise<Player> {
    const player = await this.playerModel.findById(id);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (increment < 0) {
      throw new BadRequestException('Increment score must be a positive number');
    }

    // const updatedPlayer = await this.playerModel.findByIdAndUpdate(
    //   id,
    //   { $inc: { score: increment } },
    //   { new: true },
    // );

    await this.syncToLeaderboard(id, increment, periodsInput);

    return player;
  }

  async getTopPlayers(limit: number = 100) {
    const lb = await this.leaderboardService.getLeaderboard({
      period: LeaderboardPeriod.ALL_TIME,
      limit: limit,
    });

    // Format về output API cũ
    return lb.leaderboard.map(item => ({
      rank: item.rank,
      id: item.playerId,
      name: item.user?.name || 'Unknown',
      score: item.score ? parseInt(item.score.toString(), 10) : 0,
    }));
  }

  async findOne(id: string) {
    const player = await this.playerModel.findById(id);
    if (!player) throw new NotFoundException('Player not found');

    const lbData = await this.leaderboardService.getLeaderboard({
      period: LeaderboardPeriod.ALL_TIME,
      userId: id,
      limit: 1 // limit 1 để tối ưu việc tìm Rank User
    });

    return {
      id: player.id,
      name: player.name,
      score: player.score,
      rank: lbData.userRanking?.rank || null,
    };
  }

  async remove(id: string, periodsInput?: string[]) {
    const result = await this.playerModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Player not found');

    // Remove user info từ Hash
    await this.redisService.hDel('leaderboard:userInfo', id);

    const periods = periodsInput && periodsInput.length > 0
      ? (periodsInput as LeaderboardPeriod[])
      : Object.values(LeaderboardPeriod);

    for (const period of periods) {
      // Lấy identifier hiện tại để xóa đúng key (Daily, Weekly...)
      const identifier = this.leaderboardService.getIdentifier(period);
      const lbKey = this.leaderboardService.getLbKey(period, identifier);
      await this.redisService.zRem(lbKey, id);
    }

    return { message: 'Player removed successfully' };
  }
}
