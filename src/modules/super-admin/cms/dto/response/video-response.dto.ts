import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { RoleRefDto } from './role-ref.dto';

export class SuperAdminVideoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty()
  link: string;

  @ApiProperty({ required: false, nullable: true })
  thumbnailUrl?: string | null;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [RoleRefDto] })
  roles: RoleRefDto[];

  constructor(video: any) {
    this.id = video.id;
    this.title = video.title;
    this.description = video.description ?? null;
    this.link = video.link;
    this.thumbnailUrl = video.thumbnailUrl ?? null;
    this.priority = video.priority;
    this.isActive = video.isActive;
    this.roles = video.roles ?? [];
  }
}

export class SuperAdminVideoListResponseDto {
  @ApiProperty({ type: [SuperAdminVideoResponseDto] })
  items: SuperAdminVideoResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { videos: any[]; pagination: any }) {
    this.items = response.videos.map((video) => new SuperAdminVideoResponseDto(video));
    this.pagination = response.pagination;
  }
}
