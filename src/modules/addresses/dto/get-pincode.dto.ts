import { IsNotEmpty, Matches } from 'class-validator';

export class GetPincodeDto {
  @IsNotEmpty({ message: 'Pincode is required' })
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Pincode must be a valid 6 digit Indian pincode',
  })
  pincode: string;
}
