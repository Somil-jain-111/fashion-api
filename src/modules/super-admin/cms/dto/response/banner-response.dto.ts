import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { RoleRefDto } from './role-ref.dto';

export class SuperAdminBannerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  subtitle?: string | null;

  @ApiProperty()
  image: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  redirectType: string;

  @ApiProperty({ required: false, nullable: true })
  redirectValue?: string | null;

  @ApiProperty()
  priority: number;

  @ApiProperty({ type: [RoleRefDto] })
  roles: RoleRefDto[];

  constructor(banner: any) {
    this.id = banner.id;
    this.title = banner.title;
    this.subtitle = banner.subtitle ?? null;
    this.image = banner.image;
    this.position = banner.position;
    this.redirectType = banner.redirectType;
    this.redirectValue = banner.redirectValue ?? null;
    this.priority = banner.priority;
    this.roles = banner.roles ?? [];
  }
}

export class SuperAdminBannerListResponseDto {
  @ApiProperty({ type: [SuperAdminBannerResponseDto] })
  items: SuperAdminBannerResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { banners: any[]; pagination: any }) {
    this.items = response.banners.map((banner) => new SuperAdminBannerResponseDto(banner));
    this.pagination = response.pagination;
  }
}
