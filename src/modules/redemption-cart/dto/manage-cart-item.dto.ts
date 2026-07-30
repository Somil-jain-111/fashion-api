import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ManageCartItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsNumber({}, { message: 'Quantity must be a valid number' })
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity: number;
}
