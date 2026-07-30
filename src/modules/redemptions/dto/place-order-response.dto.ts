import { OrderSummaryResponseDto } from './order-summary-response.dto';

export class PlaceOrderResponseDto {
  order: OrderSummaryResponseDto;
  otp: {
    orderId: string;
    otpRefId: string;
    mobile: string;
    receiverType: string;
    expiresIn: number;
    expiredAt: Date;
  };

  constructor(data: { order: any; otpDetails: any }) {
    const { order, otpDetails } = data;
    this.order = new OrderSummaryResponseDto({ order });

    this.otp = {
      orderId: order.id?.toString() || '',
      otpRefId: otpDetails.otpRefId,
      mobile: otpDetails.mobile,
      receiverType: otpDetails.receiverType,
      expiresIn: otpDetails.expiresIn,
      expiredAt: otpDetails.expiredAt,
    };
  }
}
