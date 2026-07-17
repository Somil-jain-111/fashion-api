import { Module } from '@nestjs/common';
import { OrderPlacementService } from './order-placement.service';
import { OrderPlacementController } from './order-placement.controller';

@Module({
  controllers: [OrderPlacementController],
  providers: [OrderPlacementService],
})
export class OrderPlacementModule {}
