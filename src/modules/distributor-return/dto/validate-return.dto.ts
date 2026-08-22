import { IsString, Length } from 'class-validator';

export class ValidateReturnDto {
  /**
   * The raw value scanned off the physical pair — either the pair_uid or the pair_qr
   * payload, depending on what the scanner reads. Matched against both columns. The invoice
   * is derived from the pair itself (via its assortment) rather than taken as input.
   */
  @IsString()
  @Length(1, 255)
  pairCode: string;
}
