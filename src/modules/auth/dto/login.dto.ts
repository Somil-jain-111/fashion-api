import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password!: string;
}
