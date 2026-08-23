import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class SubmitCustomerReturnDto {
  @IsNotEmpty({ message: 'Pair UID or code is required' })
  @IsString()
  pairUid: string;

  @IsNotEmpty({ message: 'Remarks is required' })
  @IsString()
  @Length(3, 255, { message: 'Remarks must be between 3 and 255 characters' })
  remarks?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimum 1 attachment is required' })
  @ArrayMaxSize(5, { message: 'Maximum 5 attachment URLs allowed' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  attachments: string[];
}
