import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

import { Platform } from '../enum/platform.enum';

export class CreateAppVersionDto {
  @IsEnum(Platform)
  platform!: Platform;

  @IsString()
  latestVersion!: string;

  @IsString()
  minimumSupportedVersion!: string;

  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @IsOptional()
  @IsUrl()
  storeUrl?: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
}