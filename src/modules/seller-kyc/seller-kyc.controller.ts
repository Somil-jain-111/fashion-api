import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { SellerKycService } from './seller-kyc.service';
import { VerifyPanDto } from './dto/verify-pan.dto';
import { VerifyGstDto } from './dto/verify-gst.dto';
import { GenerateAadhaarOtpDto } from './dto/generate-aadhaar-otp.dto';
import { VerifyAadhaarOtpDto } from './dto/verify-aadhaar-otp.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';

@NoCache()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SELLER_ADMIN])
@Controller('sellers/kyc')
export class SellerKycController {
  constructor(private readonly sellerKycService: SellerKycService) {}
  @NoCache()
  @Post('pan/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PAN_VERIFIED)
  async verifyPan(@Req() req: any, @Body() body: VerifyPanDto) {
    const response = await this.sellerKycService.verifyPan(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('gst/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.GST_VERIFIED)
  async verifyGst(@Req() req: any, @Body() body: VerifyGstDto) {
    const response = await this.sellerKycService.verifyGst(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('aadhaar/generate-otp')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_OTP_GENERATED)
  async generateAadhaarOtp(@Req() req: any, @Body() body: GenerateAadhaarOtpDto) {
    const response = await this.sellerKycService.generateAadhaarOtp(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('aadhaar/verify-otp')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_VERIFIED)
  async verifyAadhaarOtp(@Req() req: any, @Body() body: VerifyAadhaarOtpDto) {
    const response = await this.sellerKycService.verifyAadhaarOtp(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('profile')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PROFILE_FETCHED)
  async getProfile(@Req() req: any) {
    const response = await this.sellerKycService.getProfile(req.user.id);
    return DataSanitizer.sanitizeData(response);
  }
}
