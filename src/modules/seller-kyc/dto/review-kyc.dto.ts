import { IsNotEmpty, IsString } from 'class-validator';

export class RejectKycDto {
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  reason!: string;
}
