import { Module } from '@nestjs/common';
import { DistributorTransferController } from './distributor-transfer.controller';
import { DistributorTransferService } from './distributor-transfer.service';
import { DistributorTransferRepository } from './repository/distributor-transfer.repository';

@Module({
  controllers: [DistributorTransferController],
  providers: [DistributorTransferRepository, DistributorTransferService],
  exports: [DistributorTransferService],
})
export class DistributorTransferModule {}
