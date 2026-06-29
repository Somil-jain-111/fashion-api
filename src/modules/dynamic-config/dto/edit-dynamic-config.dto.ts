import { IsEnum, IsBoolean, IsOptional, IsNumber, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
//
import { UserType } from 'src/default/common/enums/user-type.enum';

export class ApprovalLimitsDto {
  @IsOptional()
  @ValidateNested()
  dbt?: number;

  @IsOptional()
  @ValidateNested()
  physical?: number;

  @IsOptional()
  @ValidateNested()
  digital?: number;
}

export class AdditionalSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ApprovalLimitsDto)
  approvalLimits?: ApprovalLimitsDto;

  @IsOptional()
  @IsBoolean()
  cappingLimitEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cappingLimitPercentage?: number;
}

export class RedemptionOptionsDto {
  @IsOptional()
  @IsBoolean()
  physical?: boolean;

  @IsOptional()
  @IsBoolean()
  digital?: boolean;

  @IsOptional()
  @IsBoolean()
  dbt?: boolean;
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
