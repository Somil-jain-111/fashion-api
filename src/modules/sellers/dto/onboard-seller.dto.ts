import { IsNotEmpty, IsString } from 'class-validator';

export class OnboardSellerDto {
  @IsNotEmpty({ message: 'Store name is required' })
  @IsString()
  storeName!: string;
}
