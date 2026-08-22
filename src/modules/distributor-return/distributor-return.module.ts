import { Module } from '@nestjs/common';
import { DistributorReturnController } from './distributor-return.controller';
import { DistributorReturnService } from './distributor-return.service';
import { DistributorReturnRepository } from './repository/distributor-return.repository';

@Module({
  controllers: [DistributorReturnController],
  providers: [DistributorReturnRepository, DistributorReturnService],
  exports: [DistributorReturnService],
})
export class DistributorReturnModule {}
