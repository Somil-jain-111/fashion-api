import { IsNotEmpty, IsString } from 'class-validator';

export class SendRedemptionOtpDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;
}