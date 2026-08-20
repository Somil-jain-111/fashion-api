import { IsEnum, IsNotEmpty } from 'class-validator';
import { DistUserRoles } from 'src/default/common/enums/user-type.enum';

export class DistMappingQueryDto {
  @IsEnum(DistUserRoles)
  @IsNotEmpty()
  distRole!: DistUserRoles;
}
