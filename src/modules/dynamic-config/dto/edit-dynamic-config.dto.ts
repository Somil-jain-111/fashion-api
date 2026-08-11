import { IsEnum, IsBoolean, IsOptional, IsNumber, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
//
import { UserRole } from 'src/default/common/enums/user-type.enum';

export class AdditionalSettingsDto {
  @IsOptional()
  @IsBoolean()
  skipKyc?: boolean;
}

export class LimitDetailDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  maxDailyRedemptions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  maxMonthlyRedemptions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  dailyLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  monthlyLimit?: number;
}

export class RedemptionLimitsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LimitDetailDto)
  dbt?: LimitDetailDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LimitDetailDto)
  digital?: LimitDetailDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LimitDetailDto)
  physical?: LimitDetailDto;
}

export class EditDynamicConfigDto {
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
