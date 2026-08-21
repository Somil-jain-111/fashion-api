import { IsOptional, IsString, Length } from 'class-validator';
import { ValidateReturnDto } from './validate-return.dto';

export class ProcessReturnDto extends ValidateReturnDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remarks?: string;
}
