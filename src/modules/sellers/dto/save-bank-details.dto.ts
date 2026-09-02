import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class SaveBankDetailsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  accountHolderName!: string;

  @IsString()
  @Matches(/^\d{9,18}$/)
  accountNumber!: string;

  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  @Transform(({ value }) => value?.toUpperCase())
  ifscCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  branch!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankState!: string;

  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  cancelledChequeUrl!: string;
}
