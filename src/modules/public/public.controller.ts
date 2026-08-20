import { Controller, Post, Body, Req } from '@nestjs/common';
//
import { PublicService } from './public.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { ApproveKycDto, ApproveBeneficiaryDto } from './dto';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @NoCache()
  @Post('approve-kyc')
  @ResponseMessage(SUCCESS_MESSAGES.ADMIN.KYC_VERIFIED)
  async approveKycOfUser(@Req() req, @Body() body: ApproveKycDto) {
    const privateKey = req.headers?.['x-secret-key'];

    const response = await this.publicService.approveManualKyc(privateKey, body.userId, body.type);

    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post('approve-beneficiary')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.BENEFICIARY_ADDED)
  async approveBeneficiaryOfUser(@Req() req, @Body() body: ApproveBeneficiaryDto) {
    const privateKey = req.headers?.['x-secret-key'];

    const response = await this.publicService.approveManualBeneficiary(privateKey, body);

    return DataSanitizer.sanitizeData(response);
  }
}
