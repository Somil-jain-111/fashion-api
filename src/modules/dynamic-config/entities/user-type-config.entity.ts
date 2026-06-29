import { Entity, Column } from 'typeorm';
//
import { BaseEntity } from 'src/default/common/entities';
import { UserType } from 'src/default/common/enums/user-type.enum';

@Entity('user_type_config')
export class UserTypeConfig extends BaseEntity {
  @Column({ type: 'enum', enum: UserType, name: 'user_type' })
  userType!: UserType;

  @Column({ type: 'boolean', default: true, name: 'redemption_enabled' })
  redemptionEnabled!: boolean;

  @Column({
    type: 'json',
    default: true,
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
