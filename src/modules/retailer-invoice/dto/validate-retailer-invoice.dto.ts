import { IsString, Length } from 'class-validator';

export class ValidateRetailerInvoiceDto {
  @IsString()
  @Length(1, 100)
  invoiceNumber: string;
}
