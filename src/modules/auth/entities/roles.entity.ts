import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';
//
import { User } from '.';
import { BaseEntity } from '../../../default/common/entities';
import { UserRole, UserType } from '../../../default/common/enums/user-type.enum';
import { BannerEntity, CmsPageEntity, FaqEntity, AnnouncementEntity, VideoEntity } from '../../auth/entities';

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

  @ManyToMany(() => BannerEntity, (banner) => banner.roles)
  banners!: BannerEntity[];

  @ManyToMany(() => CmsPageEntity, (cmsPage) => cmsPage.roles)
  cmsPages!: CmsPageEntity[];

  @ManyToMany(() => FaqEntity, (faq) => faq.roles)
  faqs!: FaqEntity[];

  @ManyToMany(() => AnnouncementEntity, (announcement) => announcement.roles)
  announcements!: AnnouncementEntity[];

  @ManyToMany(() => VideoEntity, (video) => video.roles)
  videos!: VideoEntity[];
}
