export enum ShippingStatus {
  PENDING = 'pending',
  PLACED = 'placed',
  DELIVERED = 'delivered',
  DISPATCH = 'dispatch',
  RETURN = 'return',
  CANCELLED = 'cancelled',
  RETURN_ACCEPTED = 'return_accepted',
  RETURN_REJECTED = 'return_rejected',
  RETURN_INITIATED = 'return_initiated',
  CONFIRMED = 'confirmed',
  IN_TRANSIT = 'inTransit',
  REFUND_PRICE = 'refund_price',
  REPLACEMENT_ORDER = 'replacement_order',
  RTW_DAMAGE = 'rtw_damage',
  RTW_RTO = 'rtw_rto',
  COMPLETED = 'completed',
  PROCESSING = 'processing',
  APPROVAL_PENDING = 'approval_pending',
  APPROVAL_REJECTED = 'approval_rejected',
  Return_Intransit = 'return_intransit',
}

export enum OrderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NO_SERVICE = 'no_service',
}
