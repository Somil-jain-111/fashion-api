import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Platform } from '../app-version/enum/platform.enum';

export class CmsHomeQueryDto {
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  bannerPosition?: string;
}
