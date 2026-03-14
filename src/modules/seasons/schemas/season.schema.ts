import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Season extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, default: 'score' })
  type: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ default: 0 })
  targetScore: number;

  @Prop({ default: 0 })
  currentScore: number;

  @Prop({ default: 'ACTIVE', enum: ['PENDING', 'ACTIVE', 'CLOSED'] })
  status: string;
}

export const SeasonSchema = SchemaFactory.createForClass(Season);
