export type PaymentSplit = {
  pointsUsed: number;
  remainingPoints: number;
  baseAmount: number;
  platformFee: number;
  gstAmount: number;
  payableAmount: number;
  payableAmountInPaise: number;
};

export function calculatePaymentSplit(input: {
  userPoints: number;
  requiredPoints: number;
}): PaymentSplit {
  const availablePoints = Math.max(0, Number(input.userPoints || 0));
  const totalRequiredPoints = Math.max(0, Number(input.requiredPoints || 0));
  const pointsUsed = Math.min(availablePoints, totalRequiredPoints);
  const remainingPoints = totalRequiredPoints - pointsUsed;

  // Calculate in paise to avoid floating-point drift.
  const baseAmountPaise = Math.round(remainingPoints * 100);
  const platformFeePaise = Math.round(baseAmountPaise * 0.02);
  const gstAmountPaise = Math.round(platformFeePaise * 0.18);
  const payableAmountInPaise = baseAmountPaise + platformFeePaise + gstAmountPaise;

  return {
    pointsUsed,
    remainingPoints,
    baseAmount: baseAmountPaise / 100,
    platformFee: platformFeePaise / 100,
    gstAmount: gstAmountPaise / 100,
    payableAmount: payableAmountInPaise / 100,
    payableAmountInPaise,
  };
}
