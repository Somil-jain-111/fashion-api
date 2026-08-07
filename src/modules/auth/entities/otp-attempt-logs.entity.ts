import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
//
import { User } from './users.entity';
import { BaseEntity } from '../../../default/common/entities';
import { OtpAttemptType } from '../../../default/common/enums/common.enum';

@Entity({ name: 'otp_attempt_logs' })
export class OTPAttemptLogs extends BaseEntity {
  @Column({ type: 'enum', enum: OtpAttemptType, default: OtpAttemptType.LOGIN })
  attemptType!: OtpAttemptType;

  @Column({ type: 'varchar', length: 25, nullable: false })
  mobile!: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  otp!: string;

  @Column({ type: 'boolean', default: false, nullable: false })
  isSuccess!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  errorMessage?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
