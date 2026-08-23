import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateCustomerReturnPairDto {
  @IsNotEmpty({ message: 'Pair UID or code is required' })
  @IsString()
  pairUid: string;
}
