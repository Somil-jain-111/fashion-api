import { Module } from '@nestjs/common';
import { OrderPlacementService } from './order-placement.service';
import { OrderPlacementController } from './order-placement.controller';
import { OrderPlacementItemRepository, OrderPlacementRepository } from './repository';
import { CartItemRepository, CartRepository } from '../cart/repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OrderPlacementController],
  providers: [
    OrderPlacementService,
    OrderPlacementRepository,
    OrderPlacementItemRepository,
    CartRepository,
    CartItemRepository,
  ],
  exports: [OrderPlacementService],
})
export class OrderPlacementModule {}
