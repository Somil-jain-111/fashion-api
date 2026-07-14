import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  ValidateIf,
  Matches,
} from 'class-validator';
import { BeneficiaryType } from '../enums/approval-status.enum';

export class SubmitBasicDetailsDto {
  @IsNotEmpty()
  @IsString()
  first_name!: string;

  @IsNotEmpty()
  @IsString()
  last_name!: string;

  @IsNotEmpty()
  @IsDateString()
  dob!: string;

  @IsNotEmpty()
  @IsString()
  whatsapp_number!: string;
}

export class SubmitPanDto {
  @IsNotEmpty()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'pan_number must be a valid PAN format',
  })
  pan_number!: string;
}

export class SubmitAadhaarDto {
  @IsNotEmpty()
  @IsString()
  aadhaar_number!: string; // consumed for verification call only, never persisted raw
}

export class SubmitGstDto {
  @IsNotEmpty()
  @IsEnum(BeneficiaryType)
  beneficiary_type!: BeneficiaryType;

  // mandatory only when beneficiary_type = ENTITY
  @ValidateIf((o) => o.beneficiary_type === BeneficiaryType.ENTITY)
  @IsNotEmpty({ message: 'gstin is mandatory for ENTITY beneficiary type' })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstin must be a valid GSTIN format',
  })
  @IsOptional()
  gstin?: string;
}

export class SubmitStoreDetailsDto {
  @IsNotEmpty()
  @IsString()
  store_name!: string;

  @IsNotEmpty()
  @IsString()
  store_address!: string;

  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'store_pincode must be a 6-digit pincode' })
  store_pincode!: string;

  @IsNotEmpty()
  @IsString()
  store_city!: string;

  @IsNotEmpty()
  @IsString()
  store_state!: string;

  @IsNotEmpty()
  @IsString()
  store_front_photo_url!: string;

  @IsNotEmpty()
  @IsString()
  store_display_photo_url!: string;

  @IsNotEmpty()
  @IsString()
  geo_lat!: string;

  @IsNotEmpty()
  @IsString()
  geo_lng!: string;
}