import { IsNotEmpty, IsNumber, IsString, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyBeneficiaryOtpDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Beneficiary ID must be a number' })
  @IsNotEmpty({ message: 'Beneficiary ID is required' })
  beneficiaryId!: number;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(4, 4, { message: 'OTP must be between 4 of digits' })
  @Matches(/^\d{4,6}$/, { message: 'OTP must contain only digits' })
  otp!: string;
}
