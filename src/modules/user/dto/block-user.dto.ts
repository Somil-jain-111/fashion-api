import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TempBlockUserDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  daysToBlock!: number;

  @IsNotEmpty()
  @IsString()
  remarks!: string;
}

export class PermanentBlockUserDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @IsNotEmpty()
  @IsString()
  remarks!: string;
}

export class UnblockUserDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
