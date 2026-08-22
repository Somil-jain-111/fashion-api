import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { ValidateRetailerInvoiceDto } from './dto';
import { RetailerInvoiceService } from './services/retailer-invoice.service';

/**
 * Ref: InvoicesController.validate (src/modules/invoices/invoices.controller.ts) — same
 * shape, but this checks the invoice's distributor against the calling retailer's mapped
 * distributors (UserMapping) instead of invoice ownership.
 */
@ApiTags('Retailer Invoice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retailer-invoice')
export class RetailerInvoiceController {
  constructor(private readonly retailerInvoice: RetailerInvoiceService) {}

  @Post('validate')
  @ResponseMessage('Invoice validated successfully')
  async validate(@Req() request: any, @Body() dto: ValidateRetailerInvoiceDto) {
    const response = await this.retailerInvoice.validate(dto.invoiceNumber, String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }
}
