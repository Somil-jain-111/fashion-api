import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveCustomerReturnPairDto {
  @IsNotEmpty({ message: 'Pair code or UID is required' })
  @IsString()
  pairUid: string;
}
