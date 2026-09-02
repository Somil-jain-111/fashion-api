import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SellerBusinessType } from '../entities';

export class CreateSellerProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  businessName!: string;

  @IsEnum(SellerBusinessType)
  businessType!: SellerBusinessType;

  @ValidateIf(
    (dto: CreateSellerProfileDto) =>
      dto.businessType !== SellerBusinessType.INDIVIDUAL || dto.gstinNumber !== undefined
  )
  @IsString()
  @IsNotEmpty({ message: 'GSTIN is required for non-individual businesses' })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
  @Transform(({ value }) => value?.toUpperCase())
  gstinNumber?: string;

  @IsString()
  @Length(10, 10)
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
  @Transform(({ value }) => value?.toUpperCase())
  panNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  pincode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  contactName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  contactPhone!: string;
}
