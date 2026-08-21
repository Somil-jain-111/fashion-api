export interface PointHistoryItemDto {
  id: string;
  points: number;
  description?: string | null;
  type: string;
  status: string;
  month?: string | null;
  year?: string | null;
  expiry?: string | null;
  date: string;
  userRemainingPoints: number;
  taxablePoints: number;
  tdsPoints: number;
  transactionId?: string | null;
  orderId?: string | null;
  payoutId?: string | null;
}

export interface PointHistoryMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PointHistoryResponseDto {
  items: PointHistoryItemDto[];
  meta: PointHistoryMetaDto;
}