import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AddressType } from 'src/default/common/enums/address.enum';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Full name must be at least 3 characters long' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Full name must contain only letters and spaces without special characters or numbers',
  })
  fullName: string;

  @IsNotEmpty()
  @Matches(/^[6-9][0-9]{9}$/, {
    message: 'Mobile number must be valid 10 digit Indian mobile number',
  })
  mobile: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsNotEmpty()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Pincode must be a valid 6 digit Indian pincode',
  })
  pincode: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;

  @IsOptional()
  @IsEnum(AddressType)
  addressType?: AddressType;
}
