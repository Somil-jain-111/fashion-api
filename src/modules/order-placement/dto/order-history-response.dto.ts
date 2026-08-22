import { OrderPlacementResponseDto } from './order-placement-response.dto';

export interface OrderHistoryResponseDto {
  items: OrderPlacementResponseDto[];
  pagination: Record<string, any>;
}
