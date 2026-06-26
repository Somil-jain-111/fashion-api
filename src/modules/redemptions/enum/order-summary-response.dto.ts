export class OrderSummaryResponseDto {
  orderId: string;
  orderNumber: string | null;
  productId: string;
  productName: string;
  productSku: string;
  productImageUrl: string;
  orderType: string;
  quantity: number;
  mrp: string;
  cost: string;
  pricePoint: string;
  totalPoints: number;
  grandTotalPoints: number;
  userRemainingPoints: number;
  orderStatus: string;
  shippingStatus: string | null;

  constructor(data: { order: any; shippingDetail?: any }) {
    const { order, shippingDetail } = data;

    this.orderId = order.id?.toString() || '';
    this.orderNumber = order.order_number || null;
    this.productId = order.product_id || '';
    this.productName = order.product_name || '';
    this.productSku = order.product_sku || '';
    this.productImageUrl = order.product_image_url || '';
    this.orderType = order.order_type || '';
    this.quantity = Number(order.quantity || 0);
    this.mrp = order.mrp?.toString() || '0';
    this.cost = order.cost?.toString() || '0';
    this.pricePoint = order.price_point?.toString() || '0';
    this.totalPoints = Number(order.total_points || 0);
    this.grandTotalPoints = Number(order.grand_total_points || 0);
    this.userRemainingPoints = Number(order.user_remaining_points || 0);
    this.orderStatus = order.status || '';
    this.shippingStatus = shippingDetail?.delivery_status || null;
  }
}
