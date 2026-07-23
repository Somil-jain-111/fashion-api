import { CartItem } from '../entities/cart-items.entity';

export type CartMoneySummary = {
  totalQuantity: number;
  totalAmount: number;
  discountAmount: number;
  gstAmount: number;
  totalPayable: number;
};

export class CartCalculationHelper {
  private static readonly GST_RATE = 0.18;

  static round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  static calculateItem(input: {
    cartonSize: number;
    cartonQuantity: number;
    unitPrice: number;
    mrp: number;
  }) {
    const totalArticles = input.cartonSize * input.cartonQuantity;
    const totalAmount = this.round(input.unitPrice * totalArticles);
    const discount = this.round(Math.max(input.mrp - input.unitPrice, 0) * totalArticles);

    return {
      totalArticles,
      totalAmount,
      discount,
    };
  }

  static calculateSummary(items: CartItem[]): CartMoneySummary {
    const selectedItems = items.filter((item) => item.isSelected);

    const totalQuantity = selectedItems.reduce((sum, item) => sum + Number(item.totalArticles), 0);
    const totalPayable = this.round(
      selectedItems.reduce((sum, item) => sum + Number(item.totalAmount), 0)
    );
    const discountAmount = this.round(
      selectedItems.reduce((sum, item) => sum + Number(item.discount), 0)
    );
    const totalAmount = this.round(totalPayable + discountAmount);
    const gstAmount = this.round(totalPayable - totalPayable / (1 + this.GST_RATE));

    return {
      totalQuantity,
      totalAmount,
      discountAmount,
      gstAmount,
      totalPayable,
    };
  }

  static toMoney(value: number | string): string {
    return this.round(Number(value)).toFixed(2);
  }
}
