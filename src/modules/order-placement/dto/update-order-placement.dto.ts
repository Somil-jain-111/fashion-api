import { PartialType } from '@nestjs/swagger';
import { CreateOrderPlacementDto } from './create-order-placement.dto';

export class UpdateOrderPlacementDto extends PartialType(CreateOrderPlacementDto) {}
