import { Entity, Column } from 'typeorm';
//
import { BaseEntity } from '../../../default/common/entities';

@Entity('application_config')
export class ApplicationConfig extends BaseEntity {
  @Column({ type: 'json', nullable: true, name: 'settings' })
  settings?: Record<string, any>;
}
