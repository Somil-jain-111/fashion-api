import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { BannerPosition } from '../enum/banner-position.enum';
import { BannerRedirectType } from '../enum/banner-redirect-type.enum';
import { IsFromDateBeforeToDate } from 'src/default/common/validators/is-from-date-before-to-date.validator';

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @IsOptional()
  @IsEnum(BannerRedirectType)
  redirectType?: BannerRedirectType;

  @IsOptional()
  @IsString()
  redirectValue?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  @IsFromDateBeforeToDate('endDate', {
    message: 'startDate must be less than or equal to endDate',
  })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}