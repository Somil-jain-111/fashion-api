import { IsEnum, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
//
import { UserRole } from 'src/default/common/enums/user-type.enum';
import {
  AdditionalSettingsDto,
  RedemptionOptionsDto,
  RedemptionLimitsDto,
} from './edit-dynamic-config.dto';

export class CreateDynamicConfigDto {
  @IsEnum(UserRole)
  userRole: UserRole;

  @IsOptional()
  @IsBoolean()
  redemptionEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RedemptionOptionsDto)
  redemptionOptions?: RedemptionOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RedemptionLimitsDto)
  redemptionLimits?: RedemptionLimitsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalSettingsDto)
  additionalSettings?: AdditionalSettingsDto;
}
