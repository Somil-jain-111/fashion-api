import { ApiProperty } from '@nestjs/swagger';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { SimplePaginationDto } from 'src/default/common/dto/simple-pagination.dto';

export class SuperAdminPointResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  points: number;

  @ApiProperty({ enum: RedemptionType })
  type: RedemptionType;

  @ApiProperty({ enum: PointStatusEnum })
  status: PointStatusEnum;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty()
  userRemainingPoints: number;

  @ApiProperty({ required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userName?: string | null;

  @ApiProperty()
  date: Date;
}

export class SuperAdminPointListResponseDto {
  @ApiProperty({ type: [SuperAdminPointResponseDto] })
  items: SuperAdminPointResponseDto[];

  @ApiProperty({ type: SimplePaginationDto })
  pagination: SimplePaginationDto;

  constructor(response: { items: any[]; pagination: SimplePaginationDto }) {
    this.items = response.items;
    this.pagination = response.pagination;
  }
}
