import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SellerReviewSection } from 'src/modules/sellers/entities';

export class SellerReviewIssueDto {
  @IsEnum(SellerReviewSection)
  section!: SellerReviewSection;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  remark!: string;
}

export class RejectKycDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => SellerReviewIssueDto)
  issues!: SellerReviewIssueDto[];
}
