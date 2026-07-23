import { OrderPlacementSource, OrderPlacementStatus } from '../enum/order-placement.enum';

export class OrderPlacementItemResponseDto {
  id: string;

  productId: string;

  categoryId: string;

  subCategoryId: string;

  productName: string;

  thumbnail: string | null;

  color: string;

  size: string;

  cartonSize: number;

  cartonQuantity: number;

  totalArticles: number;

  unitPrice: string;

  mrp: string;

  discount: string;

  totalAmount: string;
}

export class OrderPlacementResponseDto {
  id: string;

  orderNumber: string;

  userId: string;

  distributorId: string;

  source: OrderPlacementSource;

  status: OrderPlacementStatus;

  totalQuantity: number;

  totalAmount: string;

  discountAmount: string;

  gstAmount: string;

  totalPayable: string;

  items: OrderPlacementItemResponseDto[];
}
