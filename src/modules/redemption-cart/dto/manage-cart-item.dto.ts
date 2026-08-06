import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
//
import { CartAction } from '../enum';

export class ManageCartItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  projectProductId: string;

  @IsNumber({}, { message: 'Quantity must be a valid number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsNotEmpty({ message: 'Action is required' })
  @IsEnum(CartAction, { message: 'Action must be either add or remove' })
  action: CartAction;
}
