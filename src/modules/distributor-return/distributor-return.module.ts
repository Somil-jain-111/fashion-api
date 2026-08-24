import { Module } from '@nestjs/common';
import { DistributorReturnController } from './distributor-return.controller';
import { DistributorReturnService } from './distributor-return.service';
import { DistributorReturnRepository } from './repository/distributor-return.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DistributorReturnController],
  providers: [DistributorReturnRepository, DistributorReturnService],
  exports: [DistributorReturnService],
})
export class DistributorReturnModule {}
