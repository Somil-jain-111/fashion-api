import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  BaseEntity,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '.';

@Entity({ name: 'login_histories' })
@Index('IDX_LOGIN_HISTORY_USER_ID', ['user_id'])
@Index('IDX_LOGIN_HISTORY_CREATED_AT', ['created_at'])
export class LoginHistories extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  user_id!: string;

  @ManyToOne(() => User, (user) => user.loginHistory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 45, nullable: true })
  latitude?: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  longitude?: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;
}
