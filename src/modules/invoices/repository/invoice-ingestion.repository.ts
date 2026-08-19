import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';
import { InvoiceAssortmentEntity } from '../entities/invoice-assortment.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';

/**
 * Write-path repository for turning an incoming distributor invoice payload into
 * invoices / invoice_items / invoice_assortments / invoice_pair_details rows.
 * Kept separate from InvoiceRepository/InvoiceItemRepository (which serve the
 * scanning flow's read/update paths) to avoid touching those actively-changing files.
 */
@Injectable()
export class InvoiceIngestionRepository {
  constructor(private readonly dataSource: DataSource) {}

  findDuplicate(
    invoiceNo: string,
    masterId: string,
    manager?: EntityManager
  ): Promise<InvoiceEntity | null> {
    return (manager?.getRepository(InvoiceEntity) ?? this.dataSource.getRepository(InvoiceEntity))
      .findOne({ where: { invoice_no: invoiceNo, master_id: masterId } });
  }

  async createInvoice(
    data: Partial<InvoiceEntity>,
    manager: EntityManager
  ): Promise<InvoiceEntity> {
    const repo = manager.getRepository(InvoiceEntity);
    return repo.save(repo.create(data));
  }

  /**
   * Bulk-inserts item rows and returns their generated ids in the same order as `rows`.
   */
  async createItems(
    rows: Partial<InvoiceItemEntity>[],
    manager: EntityManager
  ): Promise<string[]> {
    if (!rows.length) return [];
    const result = await manager
      .getRepository(InvoiceItemEntity)
      .createQueryBuilder()
      .insert()
      .into(InvoiceItemEntity)
      .values(rows)
      .execute();
    return result.identifiers.map((identifier) => identifier.id as string);
  }

  /**
   * Bulk-inserts assortment (carton) rows and returns their generated ids in the same
   * order as `rows`.
   */
  async createAssortments(
    rows: Partial<InvoiceAssortmentEntity>[],
    manager: EntityManager
  ): Promise<string[]> {
    if (!rows.length) return [];
    const result = await manager
      .getRepository(InvoiceAssortmentEntity)
      .createQueryBuilder()
      .insert()
      .into(InvoiceAssortmentEntity)
      .values(rows)
      .execute();
    return result.identifiers.map((identifier) => identifier.id as string);
  }

  /**
   * Bulk-inserts physical pair rows. Chunked to keep a single INSERT statement from
   * growing unbounded on very large invoices.
   */
  async createPairDetails(
    rows: Partial<InvoicePairDetailEntity>[],
    manager: EntityManager
  ): Promise<void> {
    if (!rows.length) return;
    const CHUNK_SIZE = 500;
    const repo = manager.getRepository(InvoicePairDetailEntity);
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await repo.createQueryBuilder().insert().into(InvoicePairDetailEntity).values(chunk).execute();
    }
  }
}
