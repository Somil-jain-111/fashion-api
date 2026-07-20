import { CartCalculationHelper } from './cart-calculation.helper';
import { CartItem } from '../entities/cart-items.entity';

describe('CartCalculationHelper', () => {
  it('calculates item totals from carton size and quantity', () => {
    const result = CartCalculationHelper.calculateItem({
      cartonSize: 6,
      cartonQuantity: 3,
      unitPrice: 1659,
      mrp: 3499,
    });

    expect(result).toEqual({
      totalArticles: 18,
      totalAmount: 29862,
      discount: 33120,
    });
  });

  it('calculates summary for selected items only with GST included', () => {
    const items = [
      {
        totalArticles: 6,
        totalAmount: 9954,
        discount: 11040,
        isSelected: true,
      },
      {
        totalArticles: 12,
        totalAmount: 16788,
        discount: 12000,
        isSelected: false,
      },
    ] as CartItem[];

    expect(CartCalculationHelper.calculateSummary(items)).toEqual({
      totalQuantity: 6,
      totalAmount: 20994,
      discountAmount: 11040,
      gstAmount: 1518.41,
      totalPayable: 9954,
    });
  });
});
