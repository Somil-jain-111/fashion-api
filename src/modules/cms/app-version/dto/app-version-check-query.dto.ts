import { IsEnum, IsOptional, IsString } from 'class-validator';

import { Platform } from '../enum/platform.enum';

export class AppVersionCheckQueryDto {
  @IsEnum(Platform)
  platform!: Platform;

  @IsOptional()
  @IsString()
  version?: string;
}
