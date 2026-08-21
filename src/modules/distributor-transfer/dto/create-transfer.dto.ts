import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @Length(1, 100)
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remarks?: string;
}
