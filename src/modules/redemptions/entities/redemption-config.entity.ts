import { UserRole, UserType } from 'src/default/common/enums/user-type.enum';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('redemption_config')
@Index('idx_redemption_config_user_role', ['user_role'], { unique: true })
export class RedemptionConfig extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @Column({
    type: 'enum',
    enum: UserRole,
    name: 'user_role',
  })
  user_role!: UserRole;

  @Column({
    type: 'boolean',
    default: true,
    name: 'redemption_enabled',
  })
  redemption_enabled!: boolean;

  @Column({
    type: 'boolean',
    default: true,
    name: 'physical_redemption_enabled',
  })
  physical_redemption_enabled!: boolean;

  @Column({
    type: 'boolean',
    default: true,
    name: 'digital_redemption_enabled',
  })
  digital_redemption_enabled!: boolean;

  @Column({
    type: 'boolean',
    default: true,
    name: 'dbt_enabled',
  })
  dbt_enabled!: boolean;

  @Column({
    type: 'json',
    nullable: true,
    name: 'max_daily_redemptions',
  })
  max_daily_redemptions?: {
    physical?: number;
    digital?: number;
    dbt?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    name: 'max_monthly_redemptions',
  })
  max_monthly_redemptions?: {
    physical?: number;
    digital?: number;
    dbt?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    name: 'limits',
  })
  limits?: {
    dbt?: {
      daily?: number;
      monthly?: number;
    };
    digital?: {
      daily?: number;
      monthly?: number;
    };
    physical?: {
      daily?: number;
      monthly?: number;
    };
    [key: string]: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    name: 'additional_settings',
  })
  additional_settings?: Record<string, any>;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
