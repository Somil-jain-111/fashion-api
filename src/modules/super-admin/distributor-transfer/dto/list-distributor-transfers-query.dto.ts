import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { TransferRequestStatus } from 'src/modules/distributor-transfer/enum/transfer-request-status.enum';

export class ListDistributorTransfersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  fromDistributorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  toDistributorId?: number;

  @IsOptional()
  @IsEnum(TransferRequestStatus)
  status?: TransferRequestStatus;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

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
