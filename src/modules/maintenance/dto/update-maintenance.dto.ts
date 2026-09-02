import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMaintenanceDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;
}
