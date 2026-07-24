import { Body, Controller, Get, Post, Put, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SaveBasicInfoDto } from './dto/basic-info.dto';
import { SaveStoreInfoDto } from './dto/store-info.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SoVerificationService } from '../so-verification/so-verification.service';
import { ConfirmEmailOtpDto, ConfirmWhatsappOtpDto, SendEmailOtpDto, SendWhatsappOtpDto } from './dto/contact-verification.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService,
    private readonly soVerificationService: SoVerificationService
  ) { }

  @NoCache()
  @Put('basic-info')
  @ResponseMessage('Basic info updated successfully')
  async saveBasicInfo(@Req() req: any, @Body() dto: SaveBasicInfoDto) {
    const userId = Number(req.user.id);
    const response = await this.onboardingService.saveBasicInfo(userId, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Put('store-info')
  @ResponseMessage('Store info saved successfully')
  async saveStoreInfo(@Req() req: any, @Body() dto: SaveStoreInfoDto) {
    const userId = Number(req.user.id);
    const response = await this.onboardingService.saveStoreInfo(userId, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get('status')
  @ResponseMessage('Onboarding status fetched successfully')
  async getStatus(@Req() req: any) {
    const userId = Number(req.user.id);
    const response = await this.onboardingService.getStatus(userId);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('submit')
  @ResponseMessage('Profile submitted for approval successfully')
  async submitProfile(@Req() req: any) {
    const userId = Number(req.user.id);
    const response = await this.onboardingService.submitProfile(userId);
    return DataSanitizer.sanitizeData(response);
  }

  //   @Roles([UserRole.RETAILER])
  //   @NoCache()
  // @Get('status')
  // async getOnboardingStatus(@Req() req: any) {
  //   const response = await this.soVerificationService.getOnboardingStatus(Number(req.user.id));
  //   return DataSanitizer.sanitizeData(response);
  // }


  
// ── WhatsApp verification ─────────────────────────────────────────────────────
 
@NoCache()
@Post('verify-whatsapp/send-otp')
@ResponseMessage('WhatsApp OTP sent successfully')
async sendWhatsappOtp(@Req() req: any, @Body() dto: SendWhatsappOtpDto) {
  const response = await this.onboardingService.sendWhatsappOtp(
    Number(req.user.id),
    dto,
  );
  return DataSanitizer.sanitizeData(response);
}
 
@NoCache()
@Post('verify-whatsapp/confirm')
@ResponseMessage('WhatsApp number verified successfully')
async confirmWhatsappOtp(@Req() req: any, @Body() dto: ConfirmWhatsappOtpDto) {
  const response = await this.onboardingService.confirmWhatsappOtp(
    Number(req.user.id),
    dto,
  );
  return DataSanitizer.sanitizeData(response);
}
 
// ── Email verification ────────────────────────────────────────────────────────
 
@NoCache()
@Post('verify-email/send-otp')
@ResponseMessage('Email OTP sent successfully')
async sendEmailOtp(@Req() req: any, @Body() dto: SendEmailOtpDto) {
  const response = await this.onboardingService.sendEmailOtp(
    Number(req.user.id),
    dto,
  );
  return DataSanitizer.sanitizeData(response);
}
 
@NoCache()
@Post('verify-email/confirm')
@ResponseMessage('Email verified successfully')
async confirmEmailOtp(@Req() req: any, @Body() dto: ConfirmEmailOtpDto) {
  const response = await this.onboardingService.confirmEmailOtp(
    Number(req.user.id),
    dto,
  );
  return DataSanitizer.sanitizeData(response);
}
}
