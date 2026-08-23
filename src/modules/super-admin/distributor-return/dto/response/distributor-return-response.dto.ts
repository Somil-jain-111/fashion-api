import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';

class DistributorReturnInvoiceRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  partyName: string;
}

class DistributorReturnUserRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty({ nullable: true })
  mobile: string | null;
}

class DistributorReturnPairDto {
  @ApiProperty()
  pairUid: string;

  @ApiProperty()
  pointsRefunded: number;
}

export class SuperAdminDistributorReturnResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  returnNo: string;

  @ApiProperty()
  totalPairs: number;

  @ApiProperty()
  totalPointsRefunded: number;

  @ApiProperty({ required: false, nullable: true })
  remarks?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: DistributorReturnInvoiceRefDto })
  invoice: DistributorReturnInvoiceRefDto;

  @ApiProperty({ type: DistributorReturnUserRefDto })
  retailer: DistributorReturnUserRefDto;

  @ApiProperty({ type: DistributorReturnUserRefDto })
  distributor: DistributorReturnUserRefDto;

  @ApiProperty({ type: [DistributorReturnPairDto] })
  pairs: DistributorReturnPairDto[];

  constructor(item: any) {
    Object.assign(this, item);
  }
}

export class SuperAdminDistributorReturnListResponseDto {
  @ApiProperty({ type: [SuperAdminDistributorReturnResponseDto] })
  items: SuperAdminDistributorReturnResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { items: any[]; pagination: AddressPaginationDTO }) {
    this.items = response.items.map((item) => new SuperAdminDistributorReturnResponseDto(item));
    this.pagination = response.pagination;
  }
}
