import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { CmsType } from '../enum/cms-type.enum';

export class CreateCmsPageDto {
  @IsEnum(CmsType)
  type!: CmsType;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}