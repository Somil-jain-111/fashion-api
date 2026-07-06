import { Column, Entity, OneToMany } from 'typeorm';
//
import { User } from '.';
import { BaseEntity } from '../../../default/common/entities';
import { UserRole, UserType } from '../../../default/common/enums/user-type.enum';

@Entity('roles')
export class Roles extends BaseEntity {
  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: false,
  })
  name!: UserRole;

  @OneToMany(() => User, (users) => users.role)
  users?: User[];

  @Column({
    type: 'enum',
    enum: UserType,
  })
  user_type!: UserType;
}
