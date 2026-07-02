import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
//
import { User } from 'src/modules/auth/entities';
import { BaseEntity } from 'src/default/common/entities';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Entity('config_logs')
export class ConfigLog extends BaseEntity {
  @Column({ type: 'json', nullable: true, name: 'previous_values' })
  previousValues!: Record<string, any>;

  @Column({ type: 'json', nullable: true, name: 'new_values' })
  newValues!: Record<string, any>;

  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  @JoinColumn({ name: 'action_by' })
  actionBy!: User;

  @Column({ type: 'enum', enum: UserRole, name: 'user_role' })
  userRole!: UserRole;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;
}
