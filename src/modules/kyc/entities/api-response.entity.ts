import { BaseEntity } from '../../../default/common/entities';
import { Column, Entity, Index } from 'typeorm';

@Entity('api_responses')
@Index(['type'])
export class ApiResponseEntity extends BaseEntity {
  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 500, nullable: true })
  transactionId?: string;

  @Column({ name: 'request_url', type: 'text', nullable: true })
  requestUrl?: string;

  @Column({ name: 'request_payload', type: 'json', nullable: true })
  requestPayload?: Record<string, any>;

  @Column({ name: 'response_payload', type: 'json', nullable: true })
  responsePayload?: Record<string, any>;
}
