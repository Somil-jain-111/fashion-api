import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';

@Injectable()
export class InvoiceItemRepository extends BaseRepository<InvoiceItemEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceItemEntity));
  }

  async findByInvoiceId(
    invoiceId: string,
    queryRunner?: QueryRunner
  ): Promise<InvoiceItemEntity[]> {
    return this.getRepository(queryRunner).find({
      where: {
        invoice: { id: Number(invoiceId) },
      },
    });
  }

  async quantityByItemCode(
    invoiceId: string,
    queryRunner?: QueryRunner
  ): Promise<Map<string, number>> {
    const items = await this.findByInvoiceId(invoiceId, queryRunner);

    return new Map(items.map((item) => [item.item_code, Number(item.quantity)]));
  }

  async rateByItemCode(invoiceId: string, queryRunner?: QueryRunner): Promise<Map<string, number>> {
    const items = await this.findByInvoiceId(invoiceId, queryRunner);

    return new Map(items.map((item) => [item.item_code, Number(item.rate)]));
  }
}
