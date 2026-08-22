import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { RoleRefDto } from './role-ref.dto';

export class SuperAdminCmsPageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false, nullable: true })
  url?: string | null;

  @ApiProperty()
  version: number;

  @ApiProperty({ type: [RoleRefDto] })
  roles: RoleRefDto[];

  constructor(page: any) {
    this.id = page.id;
    this.type = page.type;
    this.title = page.title;
    this.description = page.description;
    this.url = page.url ?? null;
    this.version = page.version;
    this.roles = page.roles ?? [];
  }
}

export class SuperAdminCmsPageListResponseDto {
  @ApiProperty({ type: [SuperAdminCmsPageResponseDto] })
  items: SuperAdminCmsPageResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { cmsPages: any[]; pagination: any }) {
    this.items = response.cmsPages.map((page) => new SuperAdminCmsPageResponseDto(page));
    this.pagination = response.pagination;
  }
}
