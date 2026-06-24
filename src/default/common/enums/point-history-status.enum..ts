export enum PointStatusEnum {
  pending = "pending",
  added = "earn",
  redeem = "redeem",
  expired = "expired",
  cancelled = "cancelled",
  blocked = "blocked",
  pointZero = "pointZero",
  refund = "refund",
  adjustment = "adjustment",
  pssPayment = "pssPayment",
}

export const PointStatusMap: Record<number, string> = {
  0: "pending",
  1: "added",
  2: "redeem",
  3: "expired",
  4: "cancelled",
  5: "blocked",
  6: "pointZero",
  7: "refund",
  8: "adjustment",
  9: "pssPayment",
};

export enum PayoutStatus {
  INITIATED = "INITIATED",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  PARTIALLY_APPROVED = "PARTIALLY_APPROVED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUCCESS = "SUCCESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum PaymentApproval {
  PENDING = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  MISSED = "MISSED",
}
