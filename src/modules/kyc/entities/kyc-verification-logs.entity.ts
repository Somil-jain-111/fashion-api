import { BaseEntity } from 'src/default/common/entities';
import { KycLogStatus, KycType } from '../../../default/common/enums/kyc.enum';
import { User } from '../../auth/entities';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('kyc_verification_logs')
@Index(['user', 'type'])
@Index(['referenceId'])
@Index(['status'])
export class KycVerificationLogEntity extends BaseEntity {
  @ManyToOne(() => User, (user) => user.kyc_logs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: KycType,
  })
  type: KycType;

  @Column({
    type: 'enum',
    enum: KycLogStatus,
  })
  status: KycLogStatus;

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({ name: 'document_number', nullable: true })
  documentNumber?: string;

  @Column({ name: 'provider', nullable: true })
  provider?: string;

  @Column({ name: 'request_payload', type: 'json', nullable: true })
  requestPayload?: Record<string, any>;

  @Column({ name: 'response_payload', type: 'json', nullable: true })
  responsePayload?: Record<string, any>;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  @Column({ name: 'journey_id', nullable: true })
  journeyId?: string;
}
