import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CompleteEsignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  documentId!: string;

  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  signatureUrl!: string;
}
