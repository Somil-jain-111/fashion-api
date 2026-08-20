import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ResendBeneficiaryOtpDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Beneficiary ID must be a number' })
  @IsNotEmpty({ message: 'Beneficiary ID is required' })
  beneficiaryId!: number;
}
