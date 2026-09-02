import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateMediaUploadDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/\\]{1,255}$/)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024 * 1024)
  size!: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]{1,100}$/)
  folder?: string;
}
