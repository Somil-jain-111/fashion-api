import { IsString, Length } from 'class-validator';

export class ValidateTransferDto {
  @IsString()
  @Length(1, 100)
  invoiceNumber: string;
}
