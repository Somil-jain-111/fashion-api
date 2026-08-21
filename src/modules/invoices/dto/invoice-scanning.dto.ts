import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { InvoiceHistoryStatus } from '../enum/invoice-scan-session.enum';
import { ScanExceptionStatus } from '../enum/exception.enum';

export class ValidateInvoiceDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  invoiceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  invoiceNumber?: string;
}

export class StartSessionDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  invoiceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  invoiceNumber?: string;
}

export class ScanPairDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  pairCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  pairUid?: string;
}

export class RemovePairDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  pairCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  pairUid?: string;
}

export class BulkScanDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  pairUids: string[];
}

export class SubmitSessionDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  idempotencyKey?: string;
}

export class InvoiceHistoryQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  invoiceNumber?: string;

  @IsOptional()
  @IsEnum(InvoiceHistoryStatus)
  status?: InvoiceHistoryStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}

export class ScannedPairItemDto {
  pairCode: string;
  pairUid: string;
  subItemCode?: string;
  scannedAt: Date;
}

export class ScanProgressResponseDto {
  sessionId?: string;
  totalPairs?: number;
  scannedPairs?: number;
  remainingPairs?: number;
  estimatedPoints?: number;
  totalPoints?: number;
  status?: string;
  scannedPairList?: ScannedPairItemDto[];
  progress?: number;
  expected?: number;
  valid?: number;
  invalid?: number;
}

export class InvoiceSummaryResponseDto {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  totalPairs: number;
  alreadyScanned: number;
  remainingPairs: number;
  resume: boolean;
  status?: string;
  claimed?: boolean;
}

export class RemovePairParamsDto {
  @IsString()
  @Length(1, 100)
  pairUid: string;
}

export class UpdateScanAgeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  scanAgeDays: number;

  @IsString()
  @Length(1, 500)
  reason: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  approvalReference?: string;
}

export class ReviewExceptionDto {
  @IsString()
  status: ScanExceptionStatus;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

export class UpdatePointsExpiryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiryDays: number;
}
