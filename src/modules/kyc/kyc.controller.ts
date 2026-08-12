import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import {
  GenerateAadharOtpDto,
  VerifyAadhaarOtpDto,
  SaveAadhaarDto,
  VerifyGstDto,
  VerifyPanDto,
  AddBeneficiaryDto,
} from './dto';
import { KycService } from './kyc.service';
import { NoCache } from 'src/default/cache/cache.decorator';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('kyc')
export class KYCController {
  constructor(private readonly kycService: KycService) {}

  @NoCache()
  @SkipThrottle()
  @Post('aadhaar/generate-otp')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_OTP_GENERATED)
  async generateAadhaarOtp(@Req() req: any, @Body() body: GenerateAadharOtpDto) {
    const userId = req.user.id;

    const response = await this.kycService.generateAadhaarOtp(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('aadhaar/verify-otp')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_VERIFIED)
  async verifyAadhaarOtp(@Req() req: any, @Body() body: VerifyAadhaarOtpDto) {
    const userId = req.user.id;

    const response = await this.kycService.verifyAadhaarOtp(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('aadhaar/save')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_SAVED)
  async saveAadhaar(@Req() req: any, @Body() body: SaveAadhaarDto) {
    const userId = req.user.id;

    const response = await this.kycService.saveAadhaar(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('pan/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PAN_VERIFIED)
  async verifyPan(@Req() req: any, @Body() body: VerifyPanDto) {
    const userId = req.user.id;

    const response = await this.kycService.verifyPan(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('gst/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.GST_VERIFIED)
  async verifyGst(@Req() req: any, @Body() body: VerifyGstDto) {
    const userId = req.user.id;

    const response = await this.kycService.verifyGst(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('beneficiary/pan/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PAN_VERIFIED)
  async verifyBeneficiaryPan(@Req() req: any, @Body() body: VerifyPanDto) {
    const userId = req.user.id;

    const response = await this.kycService.verifyBeneficiaryPan(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('beneficiary')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.BENEFICIARY_ADDED)
  async addBeneficiary(@Req() req: any, @Body() body: AddBeneficiaryDto) {
    const userId = req.user.id;

    const response = await this.kycService.addBeneficiary(userId, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Get('beneficiary')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.BENEFICIARIES_FETCHED)
  async getUserBeneficiaries(@Req() req: any) {
    const userId = req.user.id;

    const response = await this.kycService.getUserBeneficiaries(userId);
    return DataSanitizer.sanitizeData(response);
  }
}
