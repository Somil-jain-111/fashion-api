import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateVideoDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl()
  link!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
