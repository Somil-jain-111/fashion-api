import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { RoleRefDto } from './role-ref.dto';

export class SuperAdminAnnouncementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false, nullable: true })
  image?: string | null;

  @ApiProperty({ required: false, nullable: true })
  redirectUrl?: string | null;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  isDismissible: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false, nullable: true })
  startDate?: string | null;

  @ApiProperty({ required: false, nullable: true })
  endDate?: string | null;

  @ApiProperty({ type: [RoleRefDto] })
  roles: RoleRefDto[];

  constructor(announcement: any) {
    this.id = announcement.id;
    this.title = announcement.title;
    this.message = announcement.message;
    this.type = announcement.type;
    this.image = announcement.image ?? null;
    this.redirectUrl = announcement.redirectUrl ?? null;
    this.priority = announcement.priority;
    this.isDismissible = announcement.isDismissible;
    this.isActive = announcement.isActive;
    this.startDate = announcement.startDate ?? null;
    this.endDate = announcement.endDate ?? null;
    this.roles = announcement.roles ?? [];
  }
}

export class SuperAdminAnnouncementListResponseDto {
  @ApiProperty({ type: [SuperAdminAnnouncementResponseDto] })
  items: SuperAdminAnnouncementResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { announcements: any[]; pagination: any }) {
    this.items = response.announcements.map((a) => new SuperAdminAnnouncementResponseDto(a));
    this.pagination = response.pagination;
  }
}
