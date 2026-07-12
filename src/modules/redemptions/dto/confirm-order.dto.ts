// src/modules/redemptions/dto/confirm-order.dto.ts

import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmOrderDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp: string;
}
