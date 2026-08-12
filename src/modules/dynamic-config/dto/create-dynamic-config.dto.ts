import { IsEnum, IsBoolean, IsOptional, IsNumber, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
//
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { AdditionalSettingsDto, RedemptionLimitsDto } from './edit-dynamic-config.dto';

export class CreateDynamicConfigDto {
  @IsEnum(UserRole)
  userRole: UserRole;

  @IsOptional()
  @IsBoolean()
  redemptionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  physicalRedemptionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  digitalRedemptionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dbtEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RedemptionLimitsDto)
  redemptionLimits?: RedemptionLimitsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalSettingsDto)
  additionalSettings?: AdditionalSettingsDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  loginMaxOtpAttempts?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  loginOtpTimeoutSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  loginOtpExpirySeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  redemptionMaxOtpAttempts?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  redemptionOtpTimeoutSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  redemptionOtpExpirySeconds?: number;
}
