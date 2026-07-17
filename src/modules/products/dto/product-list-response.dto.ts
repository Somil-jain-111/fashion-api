
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { ProductListDto } from './product-list.dto';

export class ProductListResponseDto {
  data: ProductListDto[];

  pagination: AddressPaginationDTO;
}