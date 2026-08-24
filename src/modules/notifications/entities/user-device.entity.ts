import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';
import { DevicePlatform } from '../enum/notification-channel.enum';

/**
 * Push-target registration — a user can have multiple devices. Registered via
 * POST /notifications/device-token, consumed by FirebasePushProvider to know which tokens to
 * send a PUSH notification to.
 */
@Entity({ name: 'user_devices' })
@Index('uq_user_devices_token', ['device_token'], { unique: true })
@Index('idx_user_devices_user_id', ['user'])
export class UserDeviceEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'device_token', type: 'varchar', length: 500 })
  device_token!: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform!: DevicePlatform;

  @Column({ name: 'last_seen_at', type: 'datetime' })
  last_seen_at!: Date;
}
