import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { TransferRequestStatus } from 'src/modules/distributor-transfer/enum/transfer-request-status.enum';

class DistributorTransferInvoiceRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  partyName: string;
}

class DistributorTransferDistributorRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty({ nullable: true })
  mobile: string | null;
}

export class SuperAdminDistributorTransferResponseDto {
  @ApiProperty()
  requestNo: string;

  @ApiProperty({ enum: TransferRequestStatus })
  status: TransferRequestStatus;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  totalPairs: number;

  @ApiProperty()
  skuCount: number;

  @ApiProperty()
  billingEstimate: string;

  @ApiProperty({ required: false, nullable: true })
  remarks?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: DistributorTransferInvoiceRefDto })
  invoice: DistributorTransferInvoiceRefDto;

  @ApiProperty({ type: DistributorTransferDistributorRefDto })
  fromDistributor: DistributorTransferDistributorRefDto;

  @ApiProperty({ type: DistributorTransferDistributorRefDto, nullable: true })
  toDistributor: DistributorTransferDistributorRefDto | null;

  constructor(item: any) {
    Object.assign(this, item);
  }
}

export class SuperAdminDistributorTransferListResponseDto {
  @ApiProperty({ type: [SuperAdminDistributorTransferResponseDto] })
  items: SuperAdminDistributorTransferResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { items: any[]; pagination: AddressPaginationDTO }) {
    this.items = response.items.map((item) => new SuperAdminDistributorTransferResponseDto(item));
    this.pagination = response.pagination;
  }
}
