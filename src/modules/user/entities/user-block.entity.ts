import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
//
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../../modules/auth/entities';
import { BlockType } from '../enums/user-block.enum';

@Entity('user_blocks')
export class UserBlock extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: BlockType,
    name: 'block_type',
  })
  blockType!: BlockType;

  @Column({
    type: 'int',
    nullable: true,
    name: 'days_to_block',
  })
  daysToBlock?: number | null;

  @Column({
    type: 'datetime',
    name: 'blocked_from',
  })
  blockedFrom!: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    name: 'blocked_till',
  })
  blockedTill?: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  remarks?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'blocked_by' })
  blockedBy?: User | null;
}
