import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { CreateOrderSummaryDto } from './enum/create-order-summary.dto';
import { NoCache } from 'src/default/cache/cache.decorator';

@NoCache()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Post('order-summary')
  async createOrderSummary(@Req() req: any, @Body() body: CreateOrderSummaryDto) {
    const response = await this.redemptionsService.createOrderSummary(
      req.user.id,
      body,
      UserRole.RETAILER
    );

    return DataSanitizer.sanitizeData(response);
  }
}
