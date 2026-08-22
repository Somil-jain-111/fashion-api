import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
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

  private getRepo<T extends object>(entity: new () => T, queryRunner?: QueryRunner) {
    return queryRunner
      ? queryRunner.manager.getRepository(entity)
      : this.dataSource.getRepository(entity);
  }

  async findDuplicate(
    invoiceNo: string,
    masterId: string,
    queryRunner?: QueryRunner
  ): Promise<InvoiceEntity | null> {
    return await this.getRepo(InvoiceEntity, queryRunner).findOne({
      where: { invoice_no: invoiceNo, master_id: masterId },
    });
  }

  async createInvoice(
    data: Partial<InvoiceEntity>,
    queryRunner?: QueryRunner
  ): Promise<InvoiceEntity> {
    const repo = this.getRepo(InvoiceEntity, queryRunner);
    return await repo.save(repo.create(data));
  }

  /**
   * Bulk-inserts item rows and returns their generated ids in the same order as `rows`.
   */
  async createItems(
    rows: Partial<InvoiceItemEntity>[],
    queryRunner?: QueryRunner
  ): Promise<string[]> {
    if (!rows.length) return [];
    const result = await this.getRepo(InvoiceItemEntity, queryRunner)
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
    queryRunner?: QueryRunner
  ): Promise<string[]> {
    if (!rows.length) return [];
    const result = await this.getRepo(InvoiceAssortmentEntity, queryRunner)
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
    queryRunner?: QueryRunner
  ): Promise<void> {
    if (!rows.length) return;
    const CHUNK_SIZE = 500;
    const repo = this.getRepo(InvoicePairDetailEntity, queryRunner);
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await repo
        .createQueryBuilder()
        .insert()
        .into(InvoicePairDetailEntity)
        .values(chunk)
        .execute();
    }
  }
}
