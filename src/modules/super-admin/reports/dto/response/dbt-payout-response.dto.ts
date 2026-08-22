import { ApiProperty } from '@nestjs/swagger';
import { PayoutStatus } from 'src/modules/payment/entities/payout.entity';
import { SimplePaginationDto } from 'src/default/common/dto/simple-pagination.dto';

export class SuperAdminDbtPayoutResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  points: number;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: PayoutStatus })
  status: PayoutStatus;

  @ApiProperty({ required: false, nullable: true })
  bankName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  accountNumber?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class SuperAdminDbtPayoutListResponseDto {
  @ApiProperty({ type: [SuperAdminDbtPayoutResponseDto] })
  items: SuperAdminDbtPayoutResponseDto[];

  @ApiProperty({ type: SimplePaginationDto })
  pagination: SimplePaginationDto;

  constructor(response: { items: any[]; pagination: SimplePaginationDto }) {
    this.items = response.items;
    this.pagination = response.pagination;
  }
}
