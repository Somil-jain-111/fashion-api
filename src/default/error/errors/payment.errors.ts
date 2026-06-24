
export const PAYMENT_ERRORS = {
  PAYMENT_FAILED: {
    code: "PAY_001",
    message: "Payment failed",
    statusCode: 400,
  },
  PAYMENT_NOT_FOUND: {
    code: "PAY_002",
    message: "Payment not found",
    statusCode: 404,
  },
  PAYMENT_ALREADY_COMPLETED: {
    code: "PAY_003",
    message: "Payment already completed",
    statusCode: 400,
  },
  PAYMENT_PENDING: {
    code: "PAY_004",
    message: "Payment is pending",
    statusCode: 400,
  },
  INVALID_PAYMENT_STATUS: {
    code: "PAY_005",
    message: "Invalid payment status",
    statusCode: 400,
},} as const;