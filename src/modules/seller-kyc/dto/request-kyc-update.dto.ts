import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SellerReviewSection } from 'src/modules/sellers/entities';

export class RequestKycUpdateDto {
  @IsEnum(SellerReviewSection)
  section!: SellerReviewSection;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
