import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AcceptSellerAgreementDto {
  @IsBoolean()
  accepted!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  agreementVersion!: string;
}
