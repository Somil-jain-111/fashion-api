import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities';
import { MappingStatus, MappingType } from 'src/default/common/enums/user-mapping.enum';

@Entity('user_mappings')
@Index('idx_user_mappings_parent', ['parent'])
@Index('idx_user_mappings_child', ['child'])
export class UserMapping extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'parent_user_id' })
  parent!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'child_user_id' })
  child!: User;

  @Column({
    type: 'enum',
    enum: MappingType,
    name: 'mapping_type',
  })
  mappingType!: MappingType;

  @Column({
    type: 'enum',
    enum: MappingStatus,
    default: MappingStatus.ACTIVE,
  })
  status!: MappingStatus;

}
