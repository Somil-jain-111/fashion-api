import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class VerifyAadharOtpDto {
  @IsString()
  @IsNotEmpty({ message: "Reference id is required" })
  referenceId: string;

  @IsString()
  @IsNotEmpty({ message: "OTP is required" })
  @Length(6, 6, { message: "OTP must be of 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must contain only digits" })
  otp: string;
}

export class VerifyAadhaarOtpDto {
  @IsString()
  @IsNotEmpty({ message: "Reference id is required" })
  referenceId: string;

  @IsString()
  @IsNotEmpty({ message: "Reference id otp is required" })
  referenceIdOtp: string;

  @IsString()
  @IsNotEmpty({ message: "OTP is required" })
  @Length(6, 6, { message: "OTP must be of 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must contain only digits" })
  otp: string;
}
