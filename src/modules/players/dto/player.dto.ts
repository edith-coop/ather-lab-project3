import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaderboardPeriod } from '../../leaderboard/leaderboard.service';

export class CreatePlayerDto {
  @ApiProperty({ description: 'Tên của người chơi', example: 'Gamer123' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    description: 'Danh sách các chu kỳ xếp hạng muốn khởi tạo', 
    enum: LeaderboardPeriod, 
    isArray: true, 
    required: false,
    example: ['daily', 'all'] 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LeaderboardPeriod, { each: true })
  periods?: string[];
}

export class UpdatePlayerDto {
  @ApiProperty({ description: 'Tên mới của người chơi', example: 'GamerUpdated' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class IncrementScoreDto {
  @ApiProperty({ description: 'Số điểm muốn cộng thêm', example: 10 })
  @IsNotEmpty()
  increment: number;

  @ApiProperty({ 
    description: 'Danh sách các chu kỳ xếp hạng muốn cập nhật', 
    enum: LeaderboardPeriod, 
    isArray: true, 
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LeaderboardPeriod, { each: true })
  periods?: string[];
}

export class RemovePlayerDto {
  @ApiProperty({ 
    description: 'Danh sách các chu kỳ xếp hạng muốn xóa dữ liệu', 
    enum: LeaderboardPeriod, 
    isArray: true, 
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LeaderboardPeriod, { each: true })
  periods?: string[];
}
