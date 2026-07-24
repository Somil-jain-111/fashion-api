import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SendWhatsappOtpDto {
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'whatsappNumber must be a valid 10-digit number' })
  whatsappNumber!: string;
}

export class ConfirmWhatsappOtpDto {
  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'otp must be exactly 4 digits' })
  otp!: string;
}

export class SendEmailOtpDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;
}

export class ConfirmEmailOtpDto {
  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'otp must be exactly 4 digits' })
  otp!: string;
}