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
import {
  GenerateAadhaarOtpResponseDto,
  SellerKycProfileResponseDto,
  SellerKycDashboardResponseDto,
  SellerKycUpdateRequestResponseDto,
  VerifyAadhaarOtpResponseDto,
  VerifyGstResponseDto,
  VerifyPanResponseDto,
} from './dto/kyc-response.dto';
import { RequestKycUpdateDto } from './dto/request-kyc-update.dto';
import { AllowUnapprovedSellerWrite } from 'src/default/common/decorators/allow-unapproved-seller-write.decorator';

@NoCache()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SELLER_ADMIN])
@AllowUnapprovedSellerWrite()
@Controller('sellers/kyc')
export class SellerKycController {
  constructor(private readonly sellerKycService: SellerKycService) {}
  @NoCache()
  @Post('pan/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PAN_VERIFIED)
  async verifyPan(@Req() req: any, @Body() body: VerifyPanDto): Promise<VerifyPanResponseDto> {
    const response = await this.sellerKycService.verifyPan(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('gst/verify')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.GST_VERIFIED)
  async verifyGst(@Req() req: any, @Body() body: VerifyGstDto): Promise<VerifyGstResponseDto> {
    const response = await this.sellerKycService.verifyGst(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('aadhaar/generate-otp')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_OTP_GENERATED)
  async generateAadhaarOtp(
    @Req() req: any,
    @Body() body: GenerateAadhaarOtpDto
  ): Promise<GenerateAadhaarOtpResponseDto> {
    const response = await this.sellerKycService.generateAadhaarOtp(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('aadhaar/verify-otp')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.AADHAAR_VERIFIED)
  async verifyAadhaarOtp(
    @Req() req: any,
    @Body() body: VerifyAadhaarOtpDto
  ): Promise<VerifyAadhaarOtpResponseDto> {
    const response = await this.sellerKycService.verifyAadhaarOtp(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('profile')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PROFILE_FETCHED)
  async getProfile(@Req() req: any): Promise<SellerKycProfileResponseDto> {
    const response = await this.sellerKycService.getProfile(req.user.id);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get('dashboard')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PROFILE_FETCHED)
  async getDashboard(@Req() req: any): Promise<SellerKycDashboardResponseDto> {
    const response = await this.sellerKycService.getDashboard(req.user.id);
    return DataSanitizer.sanitizeData(response) as SellerKycDashboardResponseDto;
  }

  @NoCache()
  @Post('request-update')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PROFILE_FETCHED)
  async requestUpdate(
    @Req() req: any,
    @Body() body: RequestKycUpdateDto
  ): Promise<SellerKycUpdateRequestResponseDto> {
    const response = await this.sellerKycService.requestUpdate(
      req.user.id,
      body.section,
      body.reason
    );
    return DataSanitizer.sanitizeData(response) as SellerKycUpdateRequestResponseDto;
  }
}
