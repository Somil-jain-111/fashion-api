import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceIngestionService } from './services/invoice-ingestion.service';

/**
 * Takes the distributor's raw invoice JSON (invoice + itemlist + assortmentdetail) and
 * fans it out into invoices / invoice_items / invoice_assortments / invoice_pair_details.
 * `userId` must be supplied explicitly — there is no automated distributor-partycode to
 * retailer mapping yet, so the caller states which retailer this invoice belongs to.
 */
@ApiTags('Invoice Ingestion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller('invoices')
export class InvoiceIngestionController {
  constructor(private readonly ingestion: InvoiceIngestionService) {}

  @Post('ingest')
  @ResponseMessage('Invoice ingested successfully')
  async ingest(@Body() dto: CreateInvoiceDto) {
    const response = await this.ingestion.ingest(dto);
    return DataSanitizer.sanitizeData(response);
  }
}
