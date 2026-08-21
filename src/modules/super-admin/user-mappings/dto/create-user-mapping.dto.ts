import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { MappingType } from 'src/default/common/enums/user-mapping.enum';

export class CreateUserMappingDto {
  /**
   * The retailer being mapped.
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  childId!: number;

  /**
   * The distributor or sub-distributor the retailer is mapped to.
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parentId!: number;

  @IsEnum(MappingType)
  mappingType!: MappingType;
}
