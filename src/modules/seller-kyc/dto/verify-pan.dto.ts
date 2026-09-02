import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsUrl, Length, Matches, MaxLength } from 'class-validator';

export class VerifyPanDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'PAN must be of 10 digits' })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format',
  })
  @Transform(({ value }) => value?.toUpperCase())
  panCard: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  panImage: string;
}
