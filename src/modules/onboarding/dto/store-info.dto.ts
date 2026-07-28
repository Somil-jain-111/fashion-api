import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { StoreAddressProofType } from '../../../default/common/enums/user-store.enum';
import { Type } from 'class-transformer';

export class SaveStoreInfoDto {
  @IsNumber()
  @Type(() => Number)
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @IsNotEmpty({ message: 'Latitude is required' })
  lat: number;

  @IsNumber()
  @Type(() => Number)
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @IsNotEmpty({ message: 'Longitude is required' })
  lng: number;

  @IsString()
  @IsNotEmpty({ message: 'Address Line 1 is required' })
  address1: string;

  @IsString()
  @IsOptional()
  address2?: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Pincode is required' })
  pincode: number;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  state: string;

  @IsString()
  @IsNotEmpty({ message: 'Store front facade image URL is required' })
  storeFrontFacadeImageUrl: string;

  @IsString()
  @IsNotEmpty({ message: 'Store display image URL is required' })
  storeDisplayImageUrl: string;

  @IsEnum(StoreAddressProofType, { message: 'Invalid address proof type' })
  @IsNotEmpty({ message: 'Address proof type is required' })
  addressProofType: StoreAddressProofType;

  @IsString()
  @IsOptional()
  addressProofImageUrl?: string;
}
