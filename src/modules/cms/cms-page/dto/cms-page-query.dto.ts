import { IsEnum, IsOptional, IsString } from 'class-validator';

import { CmsType } from '../enum/cms-type.enum';

export class CmsPageQueryDto {
  @IsOptional()
  @IsEnum(CmsType)
  type?: CmsType;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;
}