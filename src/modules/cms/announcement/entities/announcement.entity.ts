import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { Roles } from '../../../auth/entities/index';
import { AnnouncementType } from '../enum/announcement-type.enum';
import { BaseEntity } from '../../../../default/common/entities';

@Entity('announcements')
export class AnnouncementEntity extends BaseEntity {
  @Column()
  title!: string;

  @Column({
    type: 'longtext',
  })
  message!: string;

  @Column({
    type: 'enum',
    enum: AnnouncementType,
  })
  type!: AnnouncementType;

  @Column({
    nullable: true,
  })
  image?: string;

  @Column({
    name: 'redirect_url',
    nullable: true,
  })
  redirectUrl?: string;

  @ManyToMany(() => Roles, (role) => role.announcements)
  @JoinTable({
    name: 'announcement_roles',
    joinColumn: {
      name: 'announcement_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles!: Roles[];

  @Column({
    default: 0,
  })
  priority!: number;

  @Column({
    name: 'is_dismissible',
    default: true,
  })
  isDismissible!: boolean;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'start_date',
    type: 'timestamp',
    nullable: true,
  })
  startDate?: Date;

  @Column({
    name: 'end_date',
    type: 'timestamp',
    nullable: true,
  })
  endDate?: Date;
}
