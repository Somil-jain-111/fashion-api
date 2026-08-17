
import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { InvoiceExceptionService } from './services/invoice-exception.service';
import { ScanExceptionStatus } from './enum/exception.enum';
import { ReviewExceptionDto } from './dto';

@ApiTags('Invoice Scan Exceptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // TODO: restrict to Admin/Sales review roles
@Controller('admin')
export class InvoiceExceptionsController {
  constructor(private readonly exceptions: InvoiceExceptionService) {}

  @Get('invoices/:invoiceId/exceptions')
  async list(
    @Param('invoiceId') invoiceId: string,
    @Query('status') status?: ScanExceptionStatus
  ) {
    const response = await this.exceptions.list(invoiceId, status);
    return DataSanitizer.sanitizeData(response);
  }

  @Patch('exceptions/:exceptionId')
  async review(
    @Req() request: any,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: ReviewExceptionDto
  ) {
    const response = await this.exceptions.review(
      exceptionId,
      String(request.user.id),
      dto.status,
      dto.notes
    );
    return DataSanitizer.sanitizeData(response);
  }
}
