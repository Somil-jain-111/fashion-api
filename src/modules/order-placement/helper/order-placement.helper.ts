import  products from 'src/modules/products/mock/products.json';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { CartCalculationHelper } from 'src/modules/cart/helper/cart-calculation.helper';

export type ProductMock = {
  id: number;
  categoryId: number;
  subCategoryId: number;
  name: string;
  thumbnail: string;
  price: number;
  mrp: number;
  colors: Array<{ name: string; code: string }>;
  sizes: Array<{ size: string; isAvailable: boolean }>;
  cartons: Array<{ articles: number; sizes: string[] }>;
};

export type OrderPlacementBuildItemInput = {
  productId: number;
  color: string;
  size: string;
  cartonSize: number;
  cartonQuantity: number;
};

export class OrderPlacementHelper {
  static getProductOrThrow(productId: number): ProductMock {
    const product = (products as ProductMock[]).find((item) => item.id === Number(productId));

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  static validateVariant(product: ProductMock, input: OrderPlacementBuildItemInput): void {
    const hasColor = product.colors.some(
      (color) =>
        color.name.toLowerCase() === input.color.toLowerCase() || color.code === input.color
    );
    const size = product.sizes.find((item) => item.size === input.size);
    const carton = product.cartons.find(
      (item) => Number(item.articles) === Number(input.cartonSize)
    );

    if (!hasColor || !size?.isAvailable || !carton || !carton.sizes.includes(input.size)) {
      throw new BusinessException(ERROR_CODES.ORDER_ITEM.INVALID_ORDER_ITEM);
    }
  }

  static buildOrderItem(input: OrderPlacementBuildItemInput) {
    const product = this.getProductOrThrow(input.productId);
    this.validateVariant(product, input);

    const totals = CartCalculationHelper.calculateItem({
      cartonSize: input.cartonSize,
      cartonQuantity: input.cartonQuantity,
      unitPrice: Number(product.price),
      mrp: Number(product.mrp),
    });

    return {
      productId: product.id,
      categoryId: product.categoryId,
      subCategoryId: product.subCategoryId,
      productName: product.name,
      thumbnail: product.thumbnail || null,
      color: input.color,
      size: input.size,
      cartonSize: input.cartonSize,
      cartonQuantity: input.cartonQuantity,
      totalArticles: totals.totalArticles,
      unitPrice: product.price,
      mrp: product.mrp,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
    };
  }

  static generateOrderNumber(): string {
    const now = new Date();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `ORD-${now.getFullYear()}-${random}`;
  }
}
