import { IsEnum, IsOptional, IsString } from 'class-validator';

import { BannerPosition } from '../enum/banner-position.enum';

export class BannerQueryDto {
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @IsOptional()
  @IsString()
  search?: string;
}
