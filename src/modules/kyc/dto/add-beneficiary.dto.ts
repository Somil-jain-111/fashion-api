import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';
//
import { BeneficiaryType } from 'src/default/common/enums/kyc.enum';

export class AddBeneficiaryDto {
  @IsEnum(BeneficiaryType, { message: 'Type must be either BANK or UPI' })
  @IsNotEmpty()
  type: BeneficiaryType;

  /**
   * Fields for BANK verification
   */
  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @IsString()
  @IsNotEmpty({ message: 'Account number is required for bank verification' })
  accountNumber?: string;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @IsString()
  @IsNotEmpty({ message: 'Re-enter account number is required for bank verification' })
  reEnterAccountNumber?: string;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @IsString()
  @IsNotEmpty({ message: 'IFSC code is required for bank verification' })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  ifsc?: string;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @IsString()
  @IsNotEmpty({ message: 'Bank holder name is required for bank verification' })
  bankHolderName?: string;

  /**
   * Fields for UPI verification
   */
  @ValidateIf((o) => o.type === BeneficiaryType.UPI)
  @IsString()
  @IsNotEmpty({ message: 'UPI ID is required for UPI verification' })
  @Transform(({ value }) => value?.trim())
  upi?: string;
}
