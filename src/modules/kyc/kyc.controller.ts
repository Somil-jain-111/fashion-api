import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

import { KycService } from "./kyc.service";
import { NoCache } from "src/default/cache/cache.decorator";
import { IdempotencyInterceptor } from "src/default/common/interceptors/idempotency-check.interceptor";
import { JwtAuthGuard } from "src/default/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/default/common/guards/roles.guard";
import { Roles } from "src/default/common/decorators/roles.decorator";
import { UserRole } from "src/default/common/enums/user-type.enum";
import { ResponseMessage } from "src/default/common/decorators/response-message.decorator";
import { SUCCESS_MESSAGES } from "src/default/common/constants/success-messages.constant";
import { DataSanitizer } from "src/default/common/utils/sanitize.utils";
import { GenerateAadharOtpDto } from "./dto/generate-aadhar.dto";
import {
  VerifyAadhaarOtpDto,
  VerifyAadharOtpDto,
} from "./dto/verify-aadhar-otp.dto";
import { VerifyPanDto } from "./dto/verify-pan.dto";
import { VerifyGstDto } from "./dto/verify-gst.dto";

@NoCache()
@SkipThrottle()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller("kyc")
export class KYCController {
  constructor(private readonly kycService: KycService) {}

  @Post("aadhaar/generate-otp")
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_OTP_GENERATED)
  async generateAadhaarOtp(
    @Req() req: any,
    @Body() body: GenerateAadharOtpDto,
  ) {
    const userId = req.user.id;

    const response = await this.kycService.generateAadhaarOtp(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @Post("aadhaar/verify-otp")
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_VERIFIED)
  async verifyAadhaarOtp(@Req() req: any, @Body() body: VerifyAadhaarOtpDto) {
    const userId = req.user.id;

    const response = await this.kycService.verifyAadhaarOtp(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @Post("pan/verify")
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PAN_VERIFIED)
  async verifyPan(@Req() req: any, @Body() body: VerifyPanDto) {
    const userId = req.user.id;

    const response = await this.kycService.verifyPan(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  // @Post("gst/verify")
  // @ResponseMessage(SUCCESS_MESSAGES.KYC.GST_VERIFIED)
  // async verifyGst(@Req() req: any, @Body() body: VerifyGstDto) {
  //   const userId = req.user.id;

  //   const response = this.kycService.verifyGst(body, userId);
  //   return DataSanitizer.sanitizeData(response);
  // }
}
