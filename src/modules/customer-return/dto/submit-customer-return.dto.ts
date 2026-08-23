import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class SubmitCustomerReturnDto {
  @IsNotEmpty({ message: 'Pair UID or code is required' })
  @IsString()
  pairUid: string;

  @IsNotEmpty({ message: 'Remarks is required when issue type is OTHER' })
  @IsString()
  @Length(3, 255, { message: 'Remarks must be between 3 and 255 characters' })
  remarks?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
