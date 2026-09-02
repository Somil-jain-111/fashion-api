import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

@Entity('notification_templates')
@Unique('UQ_NOTIFICATION_TEMPLATE_CODE_CHANNEL_LOCALE', ['code', 'channel', 'locale'])
@Index(['code', 'active'])
export class NotificationTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 100 }) code!: string;
  @Column({ type: 'enum', enum: NotificationChannel }) channel!: NotificationChannel;
  @Column({ type: 'varchar', length: 10, default: 'en-IN' }) locale!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'json', nullable: true, name: 'allowed_variables' }) allowedVariables?: string[];
  @Column({ type: 'int', default: 1 }) version!: number;
}
