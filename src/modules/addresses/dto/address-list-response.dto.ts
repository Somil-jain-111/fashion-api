import { AddressResponseDTO } from './address-response.dto';

export class AddressPaginationDTO {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;

  constructor(totalItems: number, totalPages: number, currentPage: number, pageSize: number) {
    this.totalItems = totalItems;
    this.totalPages = totalPages;
    this.currentPage = currentPage;
    this.pageSize = pageSize;
  }
}

export class AddressListResponseDTO {
  addresses: AddressResponseDTO[];
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
