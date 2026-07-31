import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsUrl, Max } from 'class-validator';

export class CreatePointPurchaseDto {
  @Type(() => Number)
  @IsInt({ message: 'points must be a whole number' })
  @IsPositive({ message: 'points must be greater than zero' })
  @Max(1_000_000)
  points: number;
}

export class CreatePointPurchaseWithCallbackDto extends CreatePointPurchaseDto {
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { message: 'callback_url must be a valid HTTP or HTTPS URL' }
  )
  callback_url: string;
}
