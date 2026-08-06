import { Entity, Column } from 'typeorm';
//
import { BaseEntity } from '../../../default/common/entities';
import { UserRole } from '../../../default/common/enums/user-type.enum';

@Entity('user_role_config')
export class UserRoleConfig extends BaseEntity {
  @Column({ type: 'enum', enum: UserRole, name: 'user_role' })
  userRole!: UserRole;

  @Column({ type: 'boolean', default: true, name: 'redemption_enabled' })
  redemptionEnabled!: boolean;

  @Column({
    type: 'json',
    name: 'redemption_options',
  })
  redemptionOptions?: Record<string, any>;

  @Column({
    type: 'boolean',
    default: true,
    name: 'physical_redemption_enabled',
  })
  physicalRedemptionEnabled!: boolean;

  @Column({
    type: 'boolean',
    default: true,
    name: 'digital_redemption_enabled',
  })
  digitalRedemptionEnabled!: boolean;

  @Column({
    type: 'boolean',
    default: true,
    name: 'dbt_enabled',
  })
  dbtEnabled!: boolean;

  @Column({
    type: 'json',
    nullable: true,
    name: 'redemption_limits',
  })
  redemptionLimits?: Record<string, any>;

  @Column({ type: 'json', nullable: true, name: 'additional_settings' })
  additionalSettings?: Record<string, any>;

  @Column({ type: 'int', default: 3, name: 'login_max_otp_attempts' })
  loginMaxOtpAttempts!: number;

  @Column({ type: 'bigint', default: 3600, name: 'login_otp_timeout_seconds' })
  loginOtpTimeoutSeconds!: number;

  @Column({ type: 'bigint', default: 300, name: 'login_otp_expiry_seconds' })
  loginOtpExpirySeconds!: number;

  @Column({ type: 'int', default: 3, name: 'redemption_max_otp_attempts' })
  redemptionMaxOtpAttempts!: number;

  @Column({ type: 'bigint', default: 3600, name: 'redemption_otp_timeout_seconds' })
  redemptionOtpTimeoutSeconds!: number;

  @Column({ type: 'bigint', default: 300, name: 'redemption_otp_expiry_seconds' })
  redemptionOtpExpirySeconds!: number;
}
