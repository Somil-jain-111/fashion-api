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
    type: 'json',
    nullable: true,
    name: 'redemption_limits',
  })
  redemptionLimits?: Record<string, any>;

  @Column({ type: 'json', nullable: true, name: 'additional_settings' })
  additionalSettings?: Record<string, any>;
}
