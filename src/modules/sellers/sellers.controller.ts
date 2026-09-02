import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SellersService } from './sellers.service';
import {
  AcceptSellerAgreementDto,
  CompleteEsignDto,
  CreateSellerProfileDto,
  OnboardSellerDto,
  SaveBankDetailsDto,
  SellerAgreementResponseDto,
  SellerBankDetailsResponseDto,
  SellerEsignResponseDto,
  SellerOnboardResponseDto,
  SellerProfileResponseDto,
  SellerProfileSubmissionResponseDto,
  SellerRequirementsResponseDto,
} from './dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { AllowUnapprovedSellerWrite } from 'src/default/common/decorators/allow-unapproved-seller-write.decorator';

/**
 * Deliberately no @Roles() guard — open to any authenticated identity (customer or
 * otherwise), since the entire job of this endpoint is to grant the seller role.
 */
@NoCache()
@UseGuards(JwtAuthGuard)
@AllowUnapprovedSellerWrite()
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}
  @NoCache()
  @Post('onboard')
  @ResponseMessage(SUCCESS_MESSAGES.SELLER.ONBOARDED)
  async onboard(@Body() dto: OnboardSellerDto, @Req() req: any): Promise<SellerOnboardResponseDto> {
    const response = await this.sellersService.onboard(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Get('profile')
  async profile(@Req() req: any): Promise<SellerProfileResponseDto> {
    return DataSanitizer.sanitizeData(await this.sellersService.getProfile(req.user.id));
  }

  @Get('onboarding/requirements')
  requirements(): SellerRequirementsResponseDto {
    return DataSanitizer.sanitizeData(this.sellersService.getRequirements());
  }

  @Post('profile')
  async createProfile(
    @Body() dto: CreateSellerProfileDto,
    @Req() req: any
  ): Promise<SellerProfileSubmissionResponseDto> {
    return DataSanitizer.sanitizeData(await this.sellersService.createProfile(req.user.id, dto));
  }

  @Post('agreement/accept')
  async acceptAgreement(
    @Body() dto: AcceptSellerAgreementDto,
    @Req() req: any
  ): Promise<SellerAgreementResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.sellersService.acceptAgreement(req.user.id, dto, req)
    );
  }

  @Post('bank-details')
  async saveBankDetails(
    @Body() dto: SaveBankDetailsDto,
    @Req() req: any
  ): Promise<SellerBankDetailsResponseDto> {
    return DataSanitizer.sanitizeData(await this.sellersService.saveBankDetails(req.user.id, dto));
  }

  @Post('esign/complete')
  async completeEsign(
    @Body() dto: CompleteEsignDto,
    @Req() req: any
  ): Promise<SellerEsignResponseDto> {
    return DataSanitizer.sanitizeData(await this.sellersService.completeEsign(req.user.id, dto));
  }
}
