import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import {
  BulkScanDto,
  InvoiceHistoryQueryDto,
  ScanPairDto,
  StartSessionDto,
  SubmitSessionDto,
  ValidateInvoiceDto,
} from './dto';
import { InvoiceService } from './services';
import { NoCache } from 'src/default/cache/cache.decorator';

@ApiTags('Invoice Scanning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoiceService) {}

  @Post('validate')
  async validate(@Req() request: any, @Body() dto: ValidateInvoiceDto) {
    const response = await this.invoices.validate(dto.invoiceNumber, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post('session/start')
  async start(@Req() request: any, @Body() dto: StartSessionDto) {
    const response = await this.invoices.start(dto.invoiceNumber, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post('session/:sessionId/scan')
  async scan(@Req() request: any, @Param('sessionId') sessionId: string, @Body() dto: ScanPairDto) {
    const response = await this.invoices.scan(sessionId, String(request.user.id), dto.pairUid);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('session/:sessionId/bulk-scan')
  async bulkScan(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkScanDto
  ) {
    const response = await this.invoices.bulkScan(sessionId, String(request.user.id), dto.pairUids);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get('session/:sessionId')
  async progress(@Req() request: any, @Param('sessionId') sessionId: string) {
    const response = await this.invoices.progress(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post('session/:sessionId/submit')
  async submit(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() _dto: SubmitSessionDto
  ) {
    const response = await this.invoices.submit(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post('session/:sessionId/cancel')
  async cancel(@Req() request: any, @Param('sessionId') sessionId: string) {
    const response = await this.invoices.cancel(sessionId, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Get('history')
  async history(@Req() request: any, @Query() query: InvoiceHistoryQueryDto) {
    const response = await this.invoices.history(String(request.user.id), query);
    return DataSanitizer.sanitizeData(response);
  }

  @Get('history/:id')
  async historyDetail(@Req() request: any, @Param('id') id: string) {
    const response = await this.invoices.historyDetail(id, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Get('session/:sessionId/pairs')
  async pairs(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number
  ) {
    const response = await this.invoices.pairs(
      sessionId,
      String(request.user.id),
      page,
      Math.min(limit, 100)
    );
    return DataSanitizer.sanitizeData(response);
  }
}
