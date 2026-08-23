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
import { CustomerReturnService } from './customer-return.service';
import {
  CustomerReturnHistoryQueryDto,
  RemoveCustomerReturnPairDto,
  ScanCustomerReturnPairDto,
  UpdateCustomerReturnPairIssueDto,
} from './dto';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('customer-return')
export class CustomerReturnController {
  constructor(private readonly service: CustomerReturnService) {}

  /**
   * Start / Get Active Pending Customer Return
   * POST /customer-return/start
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('start')
  async startReturn(@Req() request: any) {
    const response = await this.service.getOrCreateActivePendingReturn(request.user.id);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Scan Pair into Active Customer Return
   * POST /customer-return/scan
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('scan')
  async scanPair(@Req() request: any, @Body() dto: ScanCustomerReturnPairDto) {
    const response = await this.service.scanPair(request.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Update Issue Type / Remarks for Pair
   * POST /customer-return/update-issue
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('update-issue')
  async updatePairIssue(@Req() request: any, @Body() dto: UpdateCustomerReturnPairIssueDto) {
    const response = await this.service.updatePairIssue(request.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Remove Pair from Active Customer Return
   * POST /customer-return/remove-pair
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('remove-pair')
  async removePair(@Req() request: any, @Body() dto: RemoveCustomerReturnPairDto) {
    const response = await this.service.removePair(request.user.id, dto.pairUid);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Cancel Active Customer Return
   * POST /customer-return/cancel
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('cancel')
  async cancelReturn(@Req() request: any) {
    const response = await this.service.cancelActiveReturn(request.user.id);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Submit Active Customer Return
   * POST /customer-return/submit
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('submit')
  async submitReturn(@Req() request: any, @Body('remarks') remarks?: string) {
    const response = await this.service.submitActiveReturn(request.user.id, remarks);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Get Active Pending Customer Return
   * GET /customer-return/active
   */
  @NoCache()
  @SkipThrottle()
  @Get('active')
  async getActiveReturn(@Req() request: any) {
    const response = await this.service.getActiveReturn(request.user.id);
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
