import { IsOptional, IsString } from 'class-validator';

export class PlaceCartOrderDto {
  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}
