import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { NoCache } from 'src/default/cache/cache.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { CustomerReturnService } from './customer-return.service';
import {
  CustomerReturnHistoryQueryDto,
  SubmitCustomerReturnDto,
  ValidateCustomerReturnPairDto,
} from './dto';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('customer-return')
export class CustomerReturnController {
  constructor(private readonly service: CustomerReturnService) {}

  /**
   * Validate pair UID against completed scanned invoices of the retailer
   * POST /customer-return/validate
   */
  @NoCache()
  @SkipThrottle()
  @Post('validate')
  async validatePair(@Req() request: any, @Body() dto: ValidateCustomerReturnPairDto) {
    const response = await this.service.validatePair(request.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Submit customer return (pairUID, issueType, remarks, photoUrl)
   * POST /customer-return/submit
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('submit')
  async submitReturn(@Req() request: any, @Body() dto: SubmitCustomerReturnDto) {
    const response = await this.service.submitReturn(request.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Get Customer Return History
   * GET /customer-return/history
   */
  @NoCache()
  @SkipThrottle()
  @Get('history')
  async getHistory(@Req() request: any, @Query() query: CustomerReturnHistoryQueryDto) {
    const response = await this.service.getHistory(request.user.id, query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Get Customer Return Detail
   * GET /customer-return/history/:id
   */
  @NoCache()
  @SkipThrottle()
  @Get('history/:id')
  async getHistoryDetail(@Req() request: any, @Param('id') id: string) {
    const response = await this.service.getHistoryDetail(request.user.id, id);
    return DataSanitizer.sanitizeData(response);
  }
}
