import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsNotEmpty({ message: 'Set-password ticket is required' })
  @IsString()
  setPasswordTicket!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters',
  })
  password!: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString()
  confirmPassword!: string;
}
