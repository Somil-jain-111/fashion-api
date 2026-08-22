import { ApiProperty } from '@nestjs/swagger';
import { SimplePaginationDto } from 'src/default/common/dto/simple-pagination.dto';

export class SuperAdminUserListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty({ required: false, nullable: true })
  username?: string | null;

  @ApiProperty({ required: false, nullable: true })
  firmName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  mobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  role?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  points: number;

  @ApiProperty()
  createdAt: Date;
}

export class SuperAdminUserListResponseDto {
  @ApiProperty({ type: [SuperAdminUserListItemDto] })
  items: SuperAdminUserListItemDto[];

  @ApiProperty({ type: SimplePaginationDto })
  pagination: SimplePaginationDto;

  constructor(response: { items: any[]; pagination: SimplePaginationDto }) {
    this.items = response.items;
    this.pagination = response.pagination;
  }
}

class SuperAdminUserAddressDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false, nullable: true })
  name?: string | null;

  @ApiProperty({ required: false, nullable: true })
  mobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  addressLine1?: string | null;

  @ApiProperty({ required: false, nullable: true })
  addressLine2?: string | null;

  @ApiProperty({ required: false, nullable: true })
  landmark?: string | null;

  @ApiProperty({ required: false, nullable: true })
  pincode?: string | null;

  @ApiProperty({ required: false, nullable: true })
  cityName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  stateName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  addressType?: string | null;
}

class SuperAdminUserKycDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false, nullable: true })
  verifiedName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  maskedDocumentNumber?: string | null;

  @ApiProperty({ required: false, nullable: true })
  failureReason?: string | null;

  @ApiProperty()
  createdAt: Date;
}

class SuperAdminUserMappedDistributorDto {
  @ApiProperty()
  mappingId: string;

  @ApiProperty()
  mappingType: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ required: false, nullable: true })
  distributorId?: number | null;

  @ApiProperty({ required: false, nullable: true })
  distributorName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  distributorRole?: string | null;
}

class SuperAdminUserMappedRetailerDto {
  @ApiProperty()
  mappingId: string;

  @ApiProperty()
  mappingType: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ required: false, nullable: true })
  retailerId?: number | null;

  @ApiProperty({ required: false, nullable: true })
  retailerName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  retailerRole?: string | null;
}

export class SuperAdminUserDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty({ required: false, nullable: true })
  username?: string | null;

  @ApiProperty({ required: false, nullable: true })
  firmName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  privateName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  mobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  role?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  points: number;

  @ApiProperty({ required: false, nullable: true })
  dateOfBirth?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [SuperAdminUserAddressDto] })
  addresses: SuperAdminUserAddressDto[];

  @ApiProperty({ type: [SuperAdminUserKycDto] })
  kyc: SuperAdminUserKycDto[];

  @ApiProperty({ type: [SuperAdminUserMappedDistributorDto] })
  mappedDistributors: SuperAdminUserMappedDistributorDto[];

  @ApiProperty({ type: [SuperAdminUserMappedRetailerDto] })
  mappedRetailers: SuperAdminUserMappedRetailerDto[];

  constructor(user: any) {
    Object.assign(this, user);
  }
}
