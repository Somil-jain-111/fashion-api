import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { AnnouncementRepository } from './repository/announcement.repository';
import { RolesRepository, UserRepository } from 'src/modules/auth/repository';

@Module({
  imports: [RedisModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, IdempotencyService,AnnouncementRepository,RolesRepository,UserRepository],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
