import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CompletedUploadPartDto {
  @IsInt()
  @Min(1)
  @Max(10_000)
  partNumber!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:"?[a-fA-F0-9]{32}(?:-\d+)?"?)$/)
  etag!: string;
}

export class CompleteMediaUploadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10_000)
  @ValidateNested({ each: true })
  @Type(() => CompletedUploadPartDto)
  parts!: CompletedUploadPartDto[];
}
