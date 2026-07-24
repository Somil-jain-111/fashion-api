import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { KycTypeFiltered } from 'src/default/common/enums/kyc.enum';

export class AdminVerifyKycDto {
  @IsNotEmpty({ message: 'userId is required' })
  @IsNumber({}, { message: 'userId must be a number' })
  userId: number;

  @IsNotEmpty({ message: 'type is required' })
  @IsEnum(KycTypeFiltered)
  type: KycTypeFiltered;
}
