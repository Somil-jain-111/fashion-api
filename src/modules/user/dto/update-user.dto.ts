import { IsDateString, IsOptional } from 'class-validator';

export class UpdateUserDatesDto {
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date of birth' })
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid anniversary date' })
  anniversaryDate?: string;
}
