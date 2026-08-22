import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';

@Injectable()
export class RetailerInvoiceRepository {
  constructor(private readonly dataSource: DataSource) {}

  findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceEntity | null> {
    return this.dataSource.getRepository(InvoiceEntity).findOne({
      where: { invoice_no: invoiceNumber },
      relations: { distributor: true },
    });
  }
}
