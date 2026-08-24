import {
  Get,
  Req,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Controller,
  UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
//
import {
  GetSessionsPairsQuery,
  InvoiceHistoryQueryDto,
  RemovePairDto,
  ScanPairDto,
  StartSessionDto,
  SubmitSessionDto,
  ValidateInvoiceDto,
} from './dto';
import { InvoiceService } from './services';
import { NoCache } from 'src/default/cache/cache.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { InvoiceOwnerType } from './enum/invoice.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoiceService) {}

  /**
   * Step 1: Retailer Invoice Validation API
   * POST /invoices/validate
   */
  @NoCache()
  @SkipThrottle()
  @Post('validate')
  async validate(@Req() request: any, @Body() dto: ValidateInvoiceDto) {
    const invoiceIdOrNumber = dto.invoiceId || dto.invoiceNumber || '';
    const response = await this.invoices.validate(
      invoiceIdOrNumber,
      String(request.user.id),
      InvoiceOwnerType.RETAILER
    );
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Step 2a: Start Session API
   * POST /invoices/session/start
   */
  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('session/start')
  async start(@Req() request: any, @Body() dto: StartSessionDto) {
    const invoiceIdOrNumber = dto.invoiceId || dto.invoiceNumber || '';
    const response = await this.invoices.start(invoiceIdOrNumber, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Step 2b: Scan Pair API
   * POST /invoices/session/:sessionId/scan
   */
  @NoCache()
  @SkipThrottle()
  @Post('session/:sessionId/scan')
  async scan(@Req() request: any, @Param('sessionId') sessionId: string, @Body() dto: ScanPairDto) {
    const pairCodeOrUid = dto.pairCode || dto.pairUid || '';
    const response = await this.invoices.scan(sessionId, String(request.user.id), pairCodeOrUid);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Step 2c: Session Progress & Summary API
   * GET /invoices/session/:sessionId
   */
  @NoCache()
  @Get('session/:sessionId')
  async progress(@Req() request: any, @Param('sessionId') sessionId: string) {
    const response = await this.invoices.progress(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Step 3: Remove Pair API (POST Endpoint)
   * POST /invoices/session/:sessionId/remove-pair
   */
  @NoCache()
  @SkipThrottle()
  @Post('session/:sessionId/remove-pair')
  async removePair(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: RemovePairDto
  ) {
    const pairCodeOrUid = dto.pairCode || dto.pairUid || '';
    const response = await this.invoices.removePair(
      sessionId,
      String(request.user.id),
      pairCodeOrUid
    );
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Step 4: Session Submission & Reward Settlement API
   * POST /invoices/session/:sessionId/submit
   */
  @NoCache()
  @SkipThrottle()
  @Post('session/:sessionId/submit')
  async submit(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() _dto: SubmitSessionDto
  ) {
    const response = await this.invoices.submit(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Cancel Session API
   * POST /invoices/session/:sessionId/cancel
   */
  @NoCache()
  @SkipThrottle()
  @Post('session/:sessionId/cancel')
  async cancel(@Req() request: any, @Param('sessionId') sessionId: string) {
    const response = await this.invoices.cancel(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /invoices/history
   */
  @NoCache()
  @SkipThrottle()
  @Get('history')
  async history(@Req() request: any, @Query() query: InvoiceHistoryQueryDto) {
    const response = await this.invoices.history(String(request.user.id), query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /invoices/history/:id
   */
  @NoCache()
  @SkipThrottle()
  @Get('history/:id')
  async historyDetail(@Req() request: any, @Param('id') id: string) {
    const response = await this.invoices.historyDetail(id, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /invoices/summary
   * Returns totalInvoices, pendingInvoices, completedInvoices, and totalPoints
   */
  @NoCache()
  @SkipThrottle()
  @Get('summary')
  async summary(@Req() request: any) {
    const response = await this.invoices.summary(String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /invoices/session/:sessionId/pairs
   */
  @NoCache()
  @SkipThrottle()
  @Get('session/:sessionId/pairs')
  async pairs(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Query() query: GetSessionsPairsQuery
  ) {
    const response = await this.invoices.pairs(
      sessionId,
      String(request.user.id),
      query.page,
      query.limit
    );

    return DataSanitizer.sanitizeData(response);
  }
}
