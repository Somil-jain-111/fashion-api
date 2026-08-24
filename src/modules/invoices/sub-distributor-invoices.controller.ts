import {
  Get,
  Req,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Controller,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  GetSessionsPairsQuery,
  InvoiceHistoryQueryDto,
  RemovePairDto,
  ScanPairDto,
  StartSessionDto,
  SubmitSessionDto,
  ValidateInvoiceDto,
} from './dto';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { InvoiceValidationService } from './services/invoice-validation.service';
import { ScanSessionService } from './services/scan-session.service';
import { PairScanningService } from './services/pair-scanning.service';
import { SubDistributorStockSettlementService } from './services/sub-distributor-stock-settlement.service';
import { InvoiceRepository, PairHistoryRepository } from './repository';
import { InvoiceOwnerType } from './enum/invoice.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

/**
 * Sub-distributor's own version of InvoicesController — same scan mechanics
 * (validate/session/scan/remove-pair/progress/cancel), reusing the exact same shared
 * services, but submit() credits the sub-distributor's stock ledger instead of awarding
 * reward points (see SubDistributorStockSettlementService).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUB_DISTRIBUTOR])
@Controller('sub-distributor')
export class SubDistributorInvoiceController {
  constructor(
    private readonly validationService: InvoiceValidationService,
    private readonly scanSessionService: ScanSessionService,
    private readonly pairScanningService: PairScanningService,
    private readonly stockSettlementService: SubDistributorStockSettlementService,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly pairHistories: PairHistoryRepository
  ) {}

  @NoCache()
  @SkipThrottle()
  @Post('invoices/validate')
  async validate(@Req() request: any, @Body() dto: ValidateInvoiceDto) {
    const invoiceIdOrNumber = dto.invoiceId || dto.invoiceNumber || '';
    const response = await this.validationService.validateInvoice(
      invoiceIdOrNumber,
      String(request.user.id),
      InvoiceOwnerType.SUB_DISTRIBUTOR
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post('invoices/session/start')
  async start(@Req() request: any, @Body() dto: StartSessionDto) {
    const invoiceIdOrNumber = dto.invoiceId || dto.invoiceNumber || '';
    const response = await this.scanSessionService.start(
      invoiceIdOrNumber,
      String(request.user.id)
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('invoices/session/:sessionId/scan')
  async scan(@Req() request: any, @Param('sessionId') sessionId: string, @Body() dto: ScanPairDto) {
    const pairCodeOrUid = dto.pairCode || dto.pairUid || '';
    const response = await this.pairScanningService.scanPair(
      sessionId,
      pairCodeOrUid,
      String(request.user.id)
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get('invoices/session/:sessionId')
  async progress(@Req() request: any, @Param('sessionId') sessionId: string) {
    const response = await this.scanSessionService.get(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('invoices/session/:sessionId/remove-pair')
  async removePair(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: RemovePairDto
  ) {
    const pairCodeOrUid = dto.pairCode || dto.pairUid || '';
    const response = await this.pairScanningService.removePair(
      sessionId,
      pairCodeOrUid,
      String(request.user.id)
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('invoices/session/:sessionId/submit')
  async submit(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() _dto: SubmitSessionDto
  ) {
    const response = await this.stockSettlementService.submitSession(
      sessionId,
      String(request.user.id)
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Post('invoices/session/:sessionId/cancel')
  async cancel(@Req() request: any, @Param('sessionId') sessionId: string) {
    const response = await this.scanSessionService.cancel(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Get('invoices/history')
  async history(@Req() request: any, @Query() query: InvoiceHistoryQueryDto) {
    const { items, total } = await this.invoiceRepository.findHistory(String(request.user.id), {
      ...query,
      page: query.page || 1,
      limit: query.limit || 10,
    });
    return DataSanitizer.sanitizeData({
      items,
      pagination: CommonUtils.generatePaginationResponse(total, query.page, query.limit),
    });
  }

  @NoCache()
  @SkipThrottle()
  @Get('invoices/history/:id')
  async historyDetail(@Req() request: any, @Param('id') id: string) {
    const invoice = await this.invoiceRepository.findOwnedById(id, String(request.user.id));
    if (!invoice) {
      throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    }
    const pairs = await this.pairHistories.findByInvoice(invoice.id, String(request.user.id));
    delete (invoice as any).items;
    return DataSanitizer.sanitizeData({
      invoice,
      scannedPairs: pairs,
      status: invoice.status,
    });
  }

  @NoCache()
  @SkipThrottle()
  @Get('invoices/summary')
  async summary(@Req() request: any) {
    const response = await this.invoiceRepository.getSummary(String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Get('invoices/session/:sessionId/pairs')
  async pairs(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Query() query: GetSessionsPairsQuery
  ) {
    const response = await this.pairHistories.findPageBySession(
      sessionId,
      String(request.user.id),
      query.page,
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Get('stock')
  async stock(@Req() request: any, @Query() query: PaginationQueryDto) {
    const response = await this.stockSettlementService.listStock(
      String(request.user.id),
      query.page,
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @SkipThrottle()
  @Get('stock/history')
  async stockHistory(@Req() request: any, @Query() query: PaginationQueryDto) {
    const response = await this.stockSettlementService.listStockHistory(
      String(request.user.id),
      query.page,
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }
}
