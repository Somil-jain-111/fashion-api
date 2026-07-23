export class CartItemResponseDto {
  id: string;

  productId: string;

  categoryId: string;

  subCategoryId: string;

  name: string;

  thumbnail: string;

  color: string;

  size: string;

  cartonSize: number;

  cartonQuantity: number;

  totalArticles: number;

  unitPrice: string;

  mrp: string;

  discount: string;

  totalAmount: string;

  isSelected: boolean;
}

export class CartSummaryDto {
  totalQuantity: number;

  totalAmount: string;

  discountAmount: string;

  gstAmount: string;

  totalPayable: string;
}

export class CartResponseDto {
  id: string;

  userId: string;

  distributorId: string;

  items: CartItemResponseDto[];

  summary: CartSummaryDto;
}
