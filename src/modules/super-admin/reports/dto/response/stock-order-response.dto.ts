import { ApiProperty } from '@nestjs/swagger';
import { OrderPlacementStatus } from 'src/modules/order-placement/enum/order-placement.enum';
import { SimplePaginationDto } from 'src/default/common/dto/simple-pagination.dto';

export class SuperAdminStockOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  source: string;

  @ApiProperty({ enum: OrderPlacementStatus })
  status: OrderPlacementStatus;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty()
  totalPayable: number;

  @ApiProperty({ required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  distributorId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  distributorName?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class SuperAdminStockOrderListResponseDto {
  @ApiProperty({ type: [SuperAdminStockOrderResponseDto] })
  items: SuperAdminStockOrderResponseDto[];

  @ApiProperty({ type: SimplePaginationDto })
  pagination: SimplePaginationDto;

  constructor(response: { items: any[]; pagination: SimplePaginationDto }) {
    this.items = response.items;
    this.pagination = response.pagination;
  }
}
