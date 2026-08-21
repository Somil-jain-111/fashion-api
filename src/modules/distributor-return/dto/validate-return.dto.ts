import { IsString, Length } from 'class-validator';

export class ValidateReturnDto {
  @IsString()
  @Length(1, 100)
  invoiceNumber: string;

  /**
   * The raw value scanned off the physical pair — either the pair_uid or the pair_qr
   * payload, depending on what the scanner reads. Matched against both columns.
   */
  @IsString()
  @Length(1, 255)
  pairCode: string;
}
