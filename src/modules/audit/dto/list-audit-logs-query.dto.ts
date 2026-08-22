import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { AuditAction } from '../enum/audit-action.enum';

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  performedBy?: number;

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
