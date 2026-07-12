import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @Matches(/^[6-9][0-9]{9}$/, {
    message: 'Mobile number must be valid 10 digit Indian mobile number',
  })
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Pincode must be a valid 6 digit Indian pincode',
  })
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;
}
