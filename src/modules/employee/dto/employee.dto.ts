import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmployeeDataDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'mobile must be a valid 10-digit number' })
  mobile!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'points must be greater than 0' })
  points!: number;

  @IsOptional()
  @IsString()
  employeeCode?: string; // Campus's internal employee identifier

  @IsOptional()
  @IsString()
  description?: string; // reason for grant e.g. "Annual bonus", "Q2 incentive"
}

export class IngestEmployeeDto {
  // Accepts either a single employee or an array
  // Single: { employee: { name, mobile, points } }
  // Batch:  { employees: [{ name, mobile, points }, ...] }

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeDataDto)
  employee?: EmployeeDataDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeDataDto)
  employees?: EmployeeDataDto[];
}

export class TopupPointsDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  points!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
