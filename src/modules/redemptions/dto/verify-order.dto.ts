import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOrderDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp: string;
}
