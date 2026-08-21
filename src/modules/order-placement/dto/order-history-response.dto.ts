import { OrderPlacementResponseDto } from './order-placement-response.dto';

export interface OrderHistoryMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface OrderHistoryResponseDto {
  items: OrderPlacementResponseDto[];
  meta: OrderHistoryMetaDto;
}