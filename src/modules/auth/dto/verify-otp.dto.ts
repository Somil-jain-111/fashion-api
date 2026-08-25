import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid Indian mobile number',
  })
  mobile?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(4, 6, {
    message: 'OTP must be between 4 to 6 digits',
  })
  otp!: string;
}
