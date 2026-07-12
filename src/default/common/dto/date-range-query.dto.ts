import { IsDateString, IsOptional } from 'class-validator';
import { IsFromDateBeforeToDate } from '../validators';

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  @IsFromDateBeforeToDate('toDate', {
    message: 'fromDate must be less than or equal to toDate',
  })
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
