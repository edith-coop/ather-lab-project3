import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './redis/redis.service';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  async getHealthStatus(): Promise<any> {
    // Check MongoDB Status
    const mongoStatus = this.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    
    // Check Redis Status
    let redisStatus = 'Disconnected';
    try {
      await this.redisService.set('test_ping', 'pong', { ttl: 10 });
      const val = await this.redisService.get('test_ping');
      if (val === 'pong') {
        redisStatus = 'Connected';
      }
    } catch (error: any) {
      redisStatus = `Error: ${error.message}`;
    }

    return {
      mongodb: mongoStatus,
      redis: redisStatus,
      message: 'Hello from fully configured NestJS backend!'
    };
  }
}
