import { IsEnum, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
//
import { UserType } from 'src/default/common/enums/user-type.enum';
import {
  AdditionalSettingsDto,
  RedemptionOptionsDto,
  RedemptionLimitsDto,
} from './edit-dynamic-config.dto';

export class CreateDynamicConfigDto {
  @IsEnum(UserType)
  userType: UserType;

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
