import { ApiProperty } from '@nestjs/swagger';
import { AddressResponseDTO } from './address-response.dto';

export class AddressPaginationDTO {
  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  pageSize: number;

  constructor(totalItems: number, totalPages: number, currentPage: number, pageSize: number) {
    this.totalItems = totalItems;
    this.totalPages = totalPages;
    this.currentPage = currentPage;
    this.pageSize = pageSize;
  }
}

export class AddressListResponseDTO {
  @ApiProperty({ type: [AddressResponseDTO] })
  addresses: AddressResponseDTO[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(addresses: any[], totalItems: number, page: number, limit: number) {
    this.addresses = addresses.map((address) => new AddressResponseDTO(address));
    this.pagination = new AddressPaginationDTO(
      totalItems,
      Math.ceil(totalItems / limit),
      page,
      limit
    );
  }
}
