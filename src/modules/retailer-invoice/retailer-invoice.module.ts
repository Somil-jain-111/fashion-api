import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RetailerInvoiceController } from './retailer-invoice.controller';
import { RetailerInvoiceRepository } from './repository/retailer-invoice.repository';
import { RetailerInvoiceService } from './services/retailer-invoice.service';

@Module({
  imports: [UserModule],
  controllers: [RetailerInvoiceController],
  providers: [RetailerInvoiceRepository, RetailerInvoiceService],
})
export class RetailerInvoiceModule {}
