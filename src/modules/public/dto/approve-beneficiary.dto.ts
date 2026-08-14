import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  BeneficiaryType,
  BeneficiaryRelationshipType,
} from 'src/default/common/enums/user-beneficiary.enum';

export class ApproveBeneficiaryDto {
  @IsNotEmpty({ message: 'userId is required' })
  @IsNumber({}, { message: 'userId must be a number' })
  userId: number;

  @IsNotEmpty({ message: 'type is required' })
  @IsEnum(BeneficiaryType, { message: 'Type must be either BANK or UPI' })
  type: BeneficiaryType;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @IsOptional()
  @IsString()
  reEnterAccountNumber?: string;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK)
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  @IsOptional()
  @IsString()
  ifsc?: string;

  @ValidateIf((o) => o.type === BeneficiaryType.BANK && !o.name && !o.beneficiaryName)
  @IsOptional()
  @IsString()
  bankHolderName?: string;

  /**
   * Fields for UPI verification
   */
  @ValidateIf((o) => o.type === BeneficiaryType.UPI)
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  upi?: string;

  /**
   * Beneficiary basic details (encrypted & stored in UserBeneficiary Entity only)
   */
  @IsOptional()
  @IsEnum(BeneficiaryRelationshipType)
  relationship?: BeneficiaryRelationshipType;

  @IsOptional()
  @IsString()
  beneficiary_name?: string;

  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be valid Indian mobile number',
  })
  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
