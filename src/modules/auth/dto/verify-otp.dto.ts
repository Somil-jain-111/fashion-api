import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be valid Indian mobile number',
  })
  mobile!: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(4, 6, {
    message: 'OTP must be between 4 to 6 digits',
  })
  otp!: string;
}
