import { ApiProperty } from '@nestjs/swagger';

/**
 * Passed straight through from the vendor rewards catalogue API (no local transformation) —
 * fields reflect what that vendor endpoint actually returns, including its Mongo-style _id.
 */
class RewardCategoryDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: boolean;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty({ required: false })
  created_by?: string;

  @ApiProperty({ required: false })
  updated_by?: string;
}

export class SuperAdminRewardCategoriesResponseDto {
  @ApiProperty()
  status: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty()
  count: number;

  @ApiProperty({ type: [RewardCategoryDto] })
  data: RewardCategoryDto[];

  constructor(response: any) {
    this.status = response.status;
    this.statusCode = response.statusCode;
    this.message = response.message;
    this.count = response.count;
    this.data = response.data ?? [];
  }
}
