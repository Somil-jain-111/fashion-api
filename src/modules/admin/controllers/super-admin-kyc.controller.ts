import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SellerKycService } from '../../seller-kyc/seller-kyc.service';
import { KycAdminListQueryDto } from '../../seller-kyc/dto/kyc-admin-list-query.dto';
import { RejectKycDto } from '../../seller-kyc/dto/review-kyc.dto';
import { SellerKycStatus } from 'src/default/common/enums/kyc.enum';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller('super-admin/kyc')
export class SuperAdminKycController {
  constructor(private readonly sellerKycService: SellerKycService) {}

  @NoCache()
  @Get()
  @ResponseMessage(SUCCESS_MESSAGES.KYC.LIST_FETCHED)
  async list(@Query() query: KycAdminListQueryDto) {
    const response = await this.sellerKycService.listForAdmin({
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get(':id')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.PROFILE_FETCHED)
  async detail(@Param('id') id: string) {
    const response = await this.sellerKycService.getAdminDetail(Number(id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post(':id/approve')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.REVIEWED)
  async approve(@Param('id') id: string, @Req() req: any) {
    const response = await this.sellerKycService.review(Number(id), {
      status: SellerKycStatus.APPROVED,
      reviewerId: req.user.id,
    });
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post(':id/reject')
  @ResponseMessage(SUCCESS_MESSAGES.KYC.REVIEWED)
  async reject(@Param('id') id: string, @Body() dto: RejectKycDto, @Req() req: any) {
    const response = await this.sellerKycService.review(Number(id), {
      status: SellerKycStatus.REJECTED,
      reason: dto.reason,
      reviewerId: req.user.id,
    });
    return DataSanitizer.sanitizeData(response);
  }
}
