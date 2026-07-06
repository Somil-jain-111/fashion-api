import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import {
  SubmitBasicDetailsDto,
  SubmitPanDto,
  SubmitAadhaarDto,
  SubmitGstDto,
  SubmitStoreDetailsDto,
} from './dto/onboarding-step.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  async getDraft(@Req() req: any) {
    const response = await this.onboardingService.getDraft(req.user.id);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('basic-details')
  @ResponseMessage('Basic details saved successfully')
  async submitBasic(@Req() req: any, @Body() dto: SubmitBasicDetailsDto) {
    const response = await this.onboardingService.submitBasicDetails(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('pan')
  @ResponseMessage('PAN details saved successfully')
  async submitPan(@Req() req: any, @Body() dto: SubmitPanDto) {
    const response = await this.onboardingService.submitPan(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('aadhaar')
  @ResponseMessage('Aadhaar details saved successfully')
  async submitAadhaar(@Req() req: any, @Body() dto: SubmitAadhaarDto) {
    const response = await this.onboardingService.submitAadhaar(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('gst')
  @ResponseMessage('GST details saved successfully')
  async submitGst(@Req() req: any, @Body() dto: SubmitGstDto) {
    const response = await this.onboardingService.submitGst(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('store-details')
  @ResponseMessage('Store details submitted. Your profile is now under review.')
  async submitStore(@Req() req: any, @Body() dto: SubmitStoreDetailsDto) {
    const response = await this.onboardingService.submitStoreDetails(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }
}