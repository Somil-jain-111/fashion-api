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

export class ValidateInvoiceDto {
  @IsString()
  @Length(1, 100)
  invoiceNumber: string;
}

export class StartSessionDto extends ValidateInvoiceDto {}

export class ScanPairDto {
  @IsString()
  @Length(1, 100)
  pairUid: string;
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

export class ScanProgressResponseDto {
  sessionId: string;
  progress: number;
  remaining: number;
  expected: number;
  valid: number;
  invalid: number;
  status: string;
}

export class InvoiceSummaryResponseDto {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  expectedPairs: number;
  alreadyScanned: number;
  remainingPairs: number;
  resume: boolean;
}
