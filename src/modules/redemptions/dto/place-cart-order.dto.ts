import { IsOptional, IsString } from 'class-validator';

export class PlaceCartOrderDto {
  @IsOptional()
  @IsString()
  addressId?: string;
}
