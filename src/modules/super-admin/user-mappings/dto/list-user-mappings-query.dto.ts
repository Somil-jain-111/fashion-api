import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { MappingType } from 'src/default/common/enums/user-mapping.enum';

export class ListUserMappingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  childId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parentId?: number;

  @IsOptional()
  @IsEnum(MappingType)
  mappingType?: MappingType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}
