import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional } from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ example: 'Summer Season 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-08-31T23:59:59.999Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ required: false, example: 100000 })
  @IsNumber()
  @IsOptional()
  targetScore?: number;
}
