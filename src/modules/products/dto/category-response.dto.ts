import { AddressPaginationDTO } from "src/modules/addresses/dto/address-list-response.dto";
import { CategoryDto } from "./category.dto";

export class CategoryResponseDto {
  data: CategoryDto[];

  pagination: AddressPaginationDTO;
}