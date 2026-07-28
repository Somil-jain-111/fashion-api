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
import {
  BulkScanDto,
  InvoiceHistoryQueryDto,
  ScanPairDto,
  StartSessionDto,
  SubmitSessionDto,
  ValidateInvoiceDto,
} from './dto';
import { InvoiceService } from './services';

@ApiTags('Invoice Scanning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoiceService) {}

  @Post('validate')
  validate(@Req() request: any, @Body() dto: ValidateInvoiceDto) {
    return this.invoices.validate(dto.invoiceNumber, String(request.user.id));
  }

  @Post('session/start')
  start(@Req() request: any, @Body() dto: StartSessionDto) {
    return this.invoices.start(dto.invoiceNumber, String(request.user.id));
  }

  @Post('session/:sessionId/scan')
  scan(@Req() request: any, @Param('sessionId') sessionId: string, @Body() dto: ScanPairDto) {
    return this.invoices.scan(sessionId, String(request.user.id), dto.pairUid);
  }

  @Post('session/:sessionId/bulk-scan')
  bulkScan(@Req() request: any, @Param('sessionId') sessionId: string, @Body() dto: BulkScanDto) {
    return this.invoices.bulkScan(sessionId, String(request.user.id), dto.pairUids);
  }

  @Get('session/:sessionId')
  progress(@Req() request: any, @Param('sessionId') sessionId: string) {
    return this.invoices.progress(sessionId, String(request.user.id));
  }

  @Post('session/:sessionId/submit')
  submit(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Body() _dto: SubmitSessionDto
  ) {
    return this.invoices.submit(sessionId, String(request.user.id));
  }

  @Post('session/:sessionId/cancel')
  cancel(@Req() request: any, @Param('sessionId') sessionId: string) {
    return this.invoices.cancel(sessionId, String(request.user.id));
  }

  @Get('history')
  history(@Req() request: any, @Query() query: InvoiceHistoryQueryDto) {
    return this.invoices.history(String(request.user.id), query);
  }

  @Get('history/:id')
  historyDetail(@Req() request: any, @Param('id') id: string) {
    return this.invoices.historyDetail(id, String(request.user.id));
  }

  @Get('session/:sessionId/pairs')
  pairs(
    @Req() request: any,
    @Param('sessionId') sessionId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number
  ) {
    return this.invoices.pairs(sessionId, String(request.user.id), page, Math.min(limit, 100));
  }
}
