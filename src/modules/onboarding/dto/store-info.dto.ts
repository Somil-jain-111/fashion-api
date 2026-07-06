import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { StoreAddressProofType } from '../../../default/common/enums/user-store.enum';

export class SaveStoreInfoDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Latitude is required' })
  lat: number;

  @IsNumber()
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
