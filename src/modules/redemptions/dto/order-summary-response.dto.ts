import { OrderItem } from '../entities/order-item.entity';

export class OrderSummaryResponseDto {
  orderId: string;
  orderNumber: string | null;
  orderType: string;
  totalItems: number;
  totalPoints: number;
  grandTotalPoints: number;
  userRemainingPoints: number;
  orderStatus: string;
  items: OrderItem[];

  constructor(data: { order: any }) {
    const { order } = data;

    this.orderId = order?.id?.toString() || '';
    this.orderNumber = order?.order_number || null;
    this.orderType = order?.order_type || '';
    this.totalItems = Number(order?.totalItems || 0);
    this.totalPoints = Number(order?.total_points || 0);
    this.grandTotalPoints = Number(order?.grand_total_points || 0);
    this.userRemainingPoints = Number(order?.user_remaining_points || 0);
    this.orderStatus = order?.status || '';
    this.items = (order?.items || []).map((item: OrderItem) => ({
      orderItemId: item?.id?.toString() || '',
      orderNumber: item?.orderNumber || null,
      productId: item?.productId || '',
      productName: item?.productName || '',
      productType: item?.productType || '',
      productSku: item?.productSku || '',
      productImageUrl: item?.productImageUrl || '',
      pricePoint: Number(item?.pricePoint || 0),
      quantity: Number(item?.quantity || 0),
      totalPoints: Number(item?.totalPoints || 0),
      cost: Number(item?.cost || 0),
      mrp: Number(item?.mrp || 0),
      status: item?.status || '',
      shippingDetailStatus: item?.shippingDetail?.delivery_status || '',
      shippingDetailMobile: item?.shippingDetail?.mobile || '',
      shippingDetailName: item?.shippingDetail?.fullname || '',
      statusHistory: (item?.statusHistory || []).map((sh: any) => ({
        id: sh?.id?.toString() || '',
        status: sh?.status || '',
        remark: sh?.remark || null,
        created_at: sh?.created_at || null,
      })),
    }));
  }
}
