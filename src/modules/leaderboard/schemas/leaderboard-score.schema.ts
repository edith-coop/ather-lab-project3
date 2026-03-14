import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { LeaderboardPeriod } from '../leaderboard.service';

@Schema({ timestamps: true })
export class LeaderboardScore extends Document {
  @Prop({ type: String, required: true, index: true })
  playerId: string;

  @Prop({ type: String, enum: LeaderboardPeriod, required: true, index: true })
  period: LeaderboardPeriod;

  @Prop({ type: String, required: true, index: true })
  identifier: string; // VD: 2024-03-14, season_id...

  @Prop({ default: 0 })
  score: number;
}

export const LeaderboardScoreSchema = SchemaFactory.createForClass(LeaderboardScore);

// Tạo Compound Index để hỗ trợ UPSERT cực nhanh
// Đảm bảo mỗi User chỉ có 1 bản ghi duy nhất cho mỗi Chu kỳ/Identifier cụ thể
LeaderboardScoreSchema.index({ playerId: 1, period: 1, identifier: 1 }, { unique: true });
