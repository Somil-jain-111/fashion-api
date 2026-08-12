import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SaveAadhaarDto {
  @IsNotEmpty({ message: 'Aadhar number is required' })
  @IsString()
  @Matches(/^[2-9]{1}[0-9]{11}$/, { message: 'Invalid Aadhaar number' })
  aadharNumber: string;

  @IsNotEmpty({ message: 'Aadhar front image is required' })
  @IsString()
  aadharFrontImage: string;

  @IsNotEmpty({ message: 'Aadhar back image is required' })
  @IsString()
  aadharBackImage: string;
}
