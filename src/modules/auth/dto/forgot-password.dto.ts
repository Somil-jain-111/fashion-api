import { IsNotEmpty, IsString, Matches } from "class-validator";

export class ForgotPasswordDto {
  @IsNotEmpty({ message: "Mobile number is required" })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: "Mobile number must be valid Indian mobile number",
  })
  mobile!: string;
}