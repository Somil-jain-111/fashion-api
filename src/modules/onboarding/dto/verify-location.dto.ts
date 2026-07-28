import { IsNotEmpty, IsNumber, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyLocationQueryDto {
  @Type(() => String)
  @IsNotEmpty({ message: 'Pincode is required' })
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Pincode must be a valid 6-digit Indian pincode',
  })
  pincode: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @IsNotEmpty({ message: 'Latitude is required' })
  lat: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @IsNotEmpty({ message: 'Longitude is required' })
  lng: number;
}
