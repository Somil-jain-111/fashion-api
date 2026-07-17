import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';

@Module({
  imports: [RedisModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, IdempotencyService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
