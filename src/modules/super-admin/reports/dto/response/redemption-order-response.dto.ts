import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, ShippingStatus } from 'src/modules/redemptions/enum/order-status.enum';
import { SimplePaginationDto } from 'src/default/common/dto/simple-pagination.dto';

class RedemptionOrderShippingDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false, nullable: true })
  shipDate?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  trackingNumber?: string | null;

  @ApiProperty({ required: false, nullable: true })
  trackingUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  podLink?: string | null;

  @ApiProperty({ required: false, nullable: true })
  deliveryPartner?: string | null;

  @ApiProperty({ required: false, nullable: true })
  remarks?: string | null;

  @ApiProperty()
  addressLine1: string;

  @ApiProperty({ required: false, nullable: true })
  addressLine2?: string | null;

  @ApiProperty({ required: false, nullable: true })
  landmark?: string | null;

  @ApiProperty()
  pincode: string;

  @ApiProperty({ required: false, nullable: true })
  cityName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  stateName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  zoneName?: string | null;

  @ApiProperty({ enum: ShippingStatus })
  deliveryStatus: ShippingStatus;

  @ApiProperty({ required: false, nullable: true })
  fullname?: string | null;

  @ApiProperty()
  mobile: string;
}

class RedemptionOrderVoucherDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  couponCode: string;

  @ApiProperty()
  vPin: string;

  @ApiProperty()
  expiryDate: Date;
}

class RedemptionOrderItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productType: string;

  @ApiProperty({ required: false, nullable: true })
  productSku?: string | null;

  @ApiProperty({ required: false, nullable: true })
  productImageUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  shortDesc?: string | null;

  @ApiProperty()
  pricePoint: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  totalPoints: number;

  @ApiProperty()
  cost: number;

  @ApiProperty()
  mrp: number;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ type: RedemptionOrderShippingDto, required: false, nullable: true })
  shippingDetail?: RedemptionOrderShippingDto | null;

  @ApiProperty({ type: RedemptionOrderVoucherDto, required: false, nullable: true })
  voucher?: RedemptionOrderVoucherDto | null;
}

export class SuperAdminRedemptionOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  orderType: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  totalItems: number;

  @ApiProperty({ required: false, nullable: true })
  orderDate?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  estimatedDate?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  remarks?: string | null;

  @ApiProperty()
  totalPoints: number;

  @ApiProperty()
  taxablePoints: number;

  @ApiProperty()
  tdsPercentage: number;

  @ApiProperty()
  tdsPoints: number;

  @ApiProperty()
  grandTotalPoints: number;

  @ApiProperty({ required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userMobile?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [RedemptionOrderItemDto] })
  items: RedemptionOrderItemDto[];
}

export class SuperAdminRedemptionOrderListResponseDto {
  @ApiProperty({ type: [SuperAdminRedemptionOrderResponseDto] })
  items: SuperAdminRedemptionOrderResponseDto[];

  @ApiProperty({ type: SimplePaginationDto })
  pagination: SimplePaginationDto;

  constructor(response: { items: any[]; pagination: SimplePaginationDto }) {
    this.items = response.items;
    this.pagination = response.pagination;
  }
}
