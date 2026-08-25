import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { OnboardSellerDto } from './dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

/**
 * Deliberately no @Roles() guard — open to any authenticated identity (customer or
 * otherwise), since the entire job of this endpoint is to grant the seller role.
 */
@NoCache()
@UseGuards(JwtAuthGuard)
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}
  @NoCache()
  @Post('onboard')
  @ResponseMessage(SUCCESS_MESSAGES.SELLER.ONBOARDED)
  async onboard(@Body() dto: OnboardSellerDto, @Req() req: any) {
    const response = await this.sellersService.onboard(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }
}
