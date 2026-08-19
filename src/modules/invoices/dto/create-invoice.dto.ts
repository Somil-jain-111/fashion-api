import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceType } from '../enum/invoice-scan-session.enum';

export class InvoicePairDetailInputDto {
  @IsNotEmpty()
  @IsString()
  pairqr!: string;

  @IsNotEmpty()
  @IsString()
  pairuid!: string;
}

export class InvoicePackingInfoInputDto {
  /**
   * Size-level item code, e.g. "S3030-04-G10" — distinct from the parent itemcode
   * on the enclosing assortment entry.
   */
  @IsNotEmpty()
  @IsString()
  itemcode!: string;

  @IsNotEmpty()
  @IsNumber()
  quantity!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoicePairDetailInputDto)
  pairdetail!: InvoicePairDetailInputDto[];
}

export class InvoiceAssortmentInputDto {
  /**
   * Parent line-item code — must match one entry in `itemlist[].itemcode`.
   */
  @IsNotEmpty()
  @IsString()
  itemcode!: string;

  @IsNotEmpty()
  @IsString()
  uid!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoicePackingInfoInputDto)
  packingInfo!: InvoicePackingInfoInputDto[];
}

export class InvoiceItemInputDto {
  @IsNotEmpty()
  @IsString()
  itemcode!: string;

  @IsNotEmpty()
  @IsString()
  itemname!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNotEmpty()
  @IsNumber()
  quantity!: number;

  @IsNotEmpty()
  @IsNumber()
  rate!: number;

  @IsNotEmpty()
  @IsNumber()
  mrp!: number;

  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  cess?: string;

  @IsNotEmpty()
  @IsNumber()
  igst!: number;

  @IsNotEmpty()
  @IsNumber()
  totalamount!: number;
}

export class CreateInvoiceDto {
  /**
   * There is no automated distributor->retailer mapping yet, so the caller must state
   * explicitly which retailer this invoice belongs to.
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId!: number;

  /**
   * The distributor issuing this invoice — checked against the retailer's mapped
   * distributor by the retailer-invoice validate flow.
   */
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  distributorId!: number;

  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  /**
   * Total points the retailer can earn from this invoice. No points-allocation formula
   * exists yet, so this is taken as-is from the caller; defaults to 0 (no reward) if omitted.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  allocatedPoints?: number;

  @IsNotEmpty()
  @IsString()
  invoiceno!: string;

  @IsNotEmpty()
  @IsDateString()
  invoicedate!: string;

  @IsNotEmpty()
  @IsString()
  partycode!: string;

  @IsNotEmpty()
  @IsString()
  partyname!: string;

  @IsNotEmpty()
  @IsString()
  masterid!: string;

  @IsNotEmpty()
  @IsNumber()
  grossamount!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  itemlist!: InvoiceItemInputDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceAssortmentInputDto)
  assortmentdetail!: InvoiceAssortmentInputDto[];
}
