import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/default/common/enums/user-type.enum';

class RedemptionLimitDetailDto {
  @ApiProperty()
  maxDailyRedemptions: number;

  @ApiProperty()
  maxMonthlyRedemptions: number;

  @ApiProperty()
  dailyLimit: number;

  @ApiProperty()
  monthlyLimit: number;
}

class RedemptionLimitsDto {
  @ApiProperty({ type: RedemptionLimitDetailDto })
  dbt: RedemptionLimitDetailDto;

  @ApiProperty({ type: RedemptionLimitDetailDto })
  digital: RedemptionLimitDetailDto;

  @ApiProperty({ type: RedemptionLimitDetailDto })
  physical: RedemptionLimitDetailDto;
}

export class SuperAdminDynamicConfigResponseDto {
  @ApiProperty({ enum: UserRole })
  userRole: UserRole;

  @ApiProperty()
  redemptionEnabled: boolean;

  @ApiProperty()
  physicalRedemptionEnabled: boolean;

  @ApiProperty()
  digitalRedemptionEnabled: boolean;

  @ApiProperty()
  dbtEnabled: boolean;

  @ApiProperty({ required: false })
  loginMaxOtpAttempts?: number;

  @ApiProperty({ required: false })
  loginOtpTimeoutSeconds?: number;

  @ApiProperty({ required: false })
  loginOtpExpirySeconds?: number;

  @ApiProperty({ required: false })
  redemptionMaxOtpAttempts?: number;

  @ApiProperty({ required: false })
  redemptionOtpTimeoutSeconds?: number;

  @ApiProperty({ required: false })
  redemptionOtpExpirySeconds?: number;

  @ApiProperty({ type: RedemptionLimitsDto, required: false })
  redemptionLimits?: RedemptionLimitsDto;

  @ApiProperty({ type: 'object', additionalProperties: true })
  additionalSettings?: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  applicationConfig?: Record<string, unknown> | null;

  constructor(config: any) {
    Object.assign(this, config);
  }
}
