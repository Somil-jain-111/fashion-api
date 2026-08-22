import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';

export class SuperAdminAppVersionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platform: string;

  @ApiProperty()
  latestVersion: string;

  @ApiProperty()
  minimumSupportedVersion: string;

  @ApiProperty()
  forceUpdate: boolean;

  @ApiProperty({ required: false, nullable: true })
  storeUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  releaseNotes?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  maintenanceMode: boolean;

  @ApiProperty({ required: false, nullable: true })
  maintenanceMessage?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(entity: any) {
    this.id = entity.id;
    this.platform = entity.platform;
    this.latestVersion = entity.latestVersion;
    this.minimumSupportedVersion = entity.minimumSupportedVersion;
    this.forceUpdate = entity.forceUpdate;
    this.storeUrl = entity.storeUrl ?? null;
    this.releaseNotes = entity.releaseNotes ?? null;
    this.isActive = entity.isActive;
    this.maintenanceMode = entity.maintenanceMode;
    this.maintenanceMessage = entity.maintenanceMessage ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}

export class SuperAdminAppVersionListResponseDto {
  @ApiProperty({ type: [SuperAdminAppVersionResponseDto] })
  items: SuperAdminAppVersionResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { appVersions: any[]; pagination: any }) {
    this.items = response.appVersions.map((v) => new SuperAdminAppVersionResponseDto(v));
    this.pagination = response.pagination;
  }
}
