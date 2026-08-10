import { calculatePaymentSplit } from '../helper/payment-split.helper';

describe('calculatePaymentSplit', () => {
  it('calculates the 2% platform fee and 18% GST on the platform fee', () => {
    expect(calculatePaymentSplit({ userPoints: 0, requiredPoints: 100 })).toEqual({
      pointsUsed: 0,
      remainingPoints: 100,
      baseAmount: 100,
      platformFee: 2,
      gstAmount: 0.36,
      payableAmount: 102.36,
      payableAmountInPaise: 10236,
    });
  });

  it('uses available points before calculating the payable amount', () => {
    const result = calculatePaymentSplit({ userPoints: 25, requiredPoints: 100 });
    expect(result.pointsUsed).toBe(25);
    expect(result.remainingPoints).toBe(75);
    expect(result.payableAmountInPaise).toBe(7677);
  });
});
