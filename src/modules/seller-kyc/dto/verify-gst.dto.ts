import { IsNotEmpty, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class VerifyGstDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GST number',
  })
  gstNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'GST certificate URL is required' })
  @MaxLength(2048)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'GST certificate must be a valid HTTP or HTTPS URL' }
  )
  gstImage: string;
}
