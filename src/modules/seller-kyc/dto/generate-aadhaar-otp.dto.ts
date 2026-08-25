import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class GenerateAadhaarOtpDto {
  @IsNotEmpty({ message: 'Aadhaar number is required' })
  @IsString()
  @Matches(/^[2-9]{1}[0-9]{11}$/, { message: 'Invalid Aadhaar number' })
  aadharNumber: string;

  @IsNotEmpty({ message: 'Aadhaar front image is required' })
  @IsString()
  aadharFrontImage: string;

  @IsNotEmpty({ message: 'Aadhaar back image is required' })
  @IsString()
  aadharBackImage: string;
}
