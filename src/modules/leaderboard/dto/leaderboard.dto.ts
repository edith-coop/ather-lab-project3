import { IsString, IsNotEmpty, IsNumber, IsArray, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaderboardPeriod } from '../leaderboard.service';

export class AddScoreDto {
  @ApiProperty({ description: 'ID của người chơi', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ description: 'Số điểm muốn cộng', example: 50 })
  @IsNumber()
  score: number;

  @ApiProperty({ 
    description: 'Danh sách các chu kỳ muốn cập nhật', 
    enum: LeaderboardPeriod, 
    isArray: true,
    example: ['daily', 'weekly', 'all']
  })
  @IsArray()
  @IsEnum(LeaderboardPeriod, { each: true })
  periods: LeaderboardPeriod[];

  @ApiProperty({ description: 'ID của Season (nếu có)', required: false })
  @IsString()
  @IsOptional()
  seasonId?: string;
}
