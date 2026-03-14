import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Player extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  score: number;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
