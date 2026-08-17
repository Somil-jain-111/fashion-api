import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';

@Injectable()
export class InvoiceItemRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByInvoiceId(invoiceId: string): Promise<InvoiceItemEntity[]> {
    return this.dataSource
      .getRepository(InvoiceItemEntity)
      .find({
        where: {
          invoice_id: invoiceId,
        },
      });
  }

  async quantityByItemCode(
    invoiceId: string,
  ): Promise<Map<string, number>> {
    const items = await this.findByInvoiceId(invoiceId);

    return new Map(
      items.map((item) => [
        item.item_code,
        Number(item.quantity),
      ]),
    );
  }

  async rateByItemCode(
    invoiceId: string,
  ): Promise<Map<string, number>> {
    const items = await this.findByInvoiceId(invoiceId);

    return new Map(
      items.map((item) => [
        item.item_code,
        Number(item.rate),
      ]),
    );
  }
}