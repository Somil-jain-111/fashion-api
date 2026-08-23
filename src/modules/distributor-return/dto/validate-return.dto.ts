import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsString, Length } from 'class-validator';

export class ValidateReturnDto {
  /**
   * Raw values scanned off the physical pairs — each either a pair_uid or the pair_qr
   * payload, depending on what the scanner reads. Matched against both columns per pair. The
   * invoice for each pair is derived from the pair itself (via its assortment) rather than
   * taken as input — pairs may belong to different invoices (and therefore different
   * retailers) within the same request.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 255, { each: true })
  pairCodes: string[];
}
