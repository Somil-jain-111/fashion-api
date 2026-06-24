import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class LoginDto {
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: "Mobile number must be valid Indian mobile number",
  })
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  password!: string;
}