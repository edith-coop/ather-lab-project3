import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { LeaderboardService, LeaderboardPeriod } from './leaderboard.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AddScoreDto } from './dto/leaderboard.dto';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Cập nhật điểm động cho nhiều chu kỳ
   */
  @Post('add-score')
  @ApiOperation({ summary: 'Add score to multiple leaderboard periods' })
  async addScore(@Body() addScoreDto: AddScoreDto) {
    return this.leaderboardService.addScoreDynamic(addScoreDto);
  }

  /**
   * Lấy bảng xếp hạng linh hoạt
   * Query: ?period=daily&identifier=2024-03-13&userId=...
   */
  @Get(':period')
  @ApiOperation({ summary: 'Get leaderboard rankings' })
  @ApiParam({ name: 'period', enum: LeaderboardPeriod, description: 'Time period' })
  @ApiQuery({ name: 'identifier', description: 'Period identifier (YYYY-MM-DD for daily, YYYY-WW for weekly, seasonId for season)', required: false })
  @ApiQuery({ name: 'userId', description: 'Current user ID for relative ranking', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of results (default 10)', required: false, type: 'number' })
  async getLeaderboard(
    @Param('period') period: LeaderboardPeriod,
    @Query('identifier') identifier: string,
    @Query('userId') userId: string,
    @Query('limit') limit: number,
  ) {
    return this.leaderboardService.getLeaderboard({
      period,
      identifier,
      userId,
      limit: limit ? Number(limit) : 10,
    });
  }
}
