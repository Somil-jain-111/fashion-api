import { IsString, IsNotEmpty, IsUrl, Matches, MaxLength } from 'class-validator';

export class GenerateAadhaarOtpDto {
  @IsNotEmpty({ message: 'Aadhaar number is required' })
  @IsString()
  @Matches(/^[2-9]{1}[0-9]{11}$/, { message: 'Invalid Aadhaar number' })
  aadharNumber: string;

  @IsNotEmpty({ message: 'Aadhaar front image is required' })
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  aadharFrontImage: string;

  @IsNotEmpty({ message: 'Aadhaar back image is required' })
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  aadharBackImage: string;
}
