import { ApiProperty } from '@nestjs/swagger';

class RewardProductPaginationDto {
  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  pageSize: number;
}

export class SuperAdminRewardProductResponseDto {
  @ApiProperty()
  projectProductId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  mrp: string;

  @ApiProperty()
  atsCost: string;

  @ApiProperty()
  discount: string;

  @ApiProperty()
  pricePoints: string;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  main_image: string;

  @ApiProperty()
  short_description: string;

  @ApiProperty()
  long_description: string;
}

export class SuperAdminRewardProductListResponseDto {
  @ApiProperty({ type: [SuperAdminRewardProductResponseDto] })
  product: SuperAdminRewardProductResponseDto[];

  @ApiProperty({ type: RewardProductPaginationDto })
  pagination: RewardProductPaginationDto;

  constructor(response: { product: any[]; pagination: any }) {
    this.product = response.product;
    this.pagination = response.pagination;
  }
}
