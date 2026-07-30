export class CartItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  pricePoint: number;
  quantity: number;
  totalItemPoints: number;
  description?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  mrp?: number | null;
  cost?: number | null;
}

export class CartResponseDto {
  cartId: string;
  totalItems: number;
  totalBasePoints: number;
  isPanVerified: boolean;
  tdsPercentage: number;
  tdsPoints: number;
  grandTotalPoints: number;
  userCurrentPoints: number;
  isPointsSufficient: boolean;
  hasPhysicalProduct: boolean;
  items: CartItemResponseDto[];
}
