import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class VerifyCartOrderDto {
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  otp: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}
