import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { SubDistributorStockEntity } from '../entities/sub-distributor-stock.entity';
import { SubDistributorStockHistoryEntity } from '../entities/sub-distributor-stock-history.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';

@Injectable()
export class SubDistributorStockRepository extends BaseRepository<SubDistributorStockEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(SubDistributorStockEntity));
  }

  /**
   * Locks the existing row (if any) for this sub-distributor/SKU pair, so concurrent
   * submissions crediting the same SKU serialize on the increment rather than racing.
   */
  findForUpdate(subDistributorId: string, itemCode: string, queryRunner: QueryRunner) {
    return this.getRepository(queryRunner)
      .createQueryBuilder('stock')
      .setLock('pessimistic_write')
      .where('stock.sub_distributor_id = :subDistributorId', { subDistributorId })
      .andWhere('stock.item_code = :itemCode', { itemCode })
      .getOne();
  }

  /**
   * Increments the existing row for this SKU, or creates one if it's the first time this
   * sub-distributor has stocked it. Caller is expected to already hold the lock via
   * findForUpdate() within the same transaction.
   */
  async incrementOrCreate(
    subDistributorId: string,
    itemCode: string,
    itemName: string | null,
    incrementBy: number,
    queryRunner: QueryRunner
  ): Promise<SubDistributorStockEntity> {
    const existing = await this.findForUpdate(subDistributorId, itemCode, queryRunner);
    const repo = this.getRepository(queryRunner);

    if (existing) {
      existing.quantity += incrementBy;
      if (itemName) existing.item_name = itemName;
      return repo.save(existing);
    }

    return repo.save(
      repo.create({
        subDistributor: { id: Number(subDistributorId) } as any,
        item_code: itemCode,
        item_name: itemName ?? undefined,
        quantity: incrementBy,
      })
    );
  }

  async listForSubDistributor(
    subDistributorId: string,
    page: number,
    limit: number
  ): Promise<{ items: SubDistributorStockEntity[]; total: number }> {
    const [items, total] = await this.repository
      .createQueryBuilder('stock')
      .where('stock.sub_distributor_id = :subDistributorId', { subDistributorId })
      .orderBy('stock.item_code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  /**
   * One history row per SKU credited in this submission, with one detail row per physical
   * pair nested underneath (cascade-saved in the same insert) — mirrors
   * DistributorReturnRepository.saveReturn's parent/child shape.
   */
  saveStockHistory(
    entries: Array<{
      subDistributorId: string;
      invoiceId: string;
      itemCode: string;
      itemName: string | null;
      quantityAdded: number;
      totalQuantityAfter: number;
      submissionId: string;
      pairs: InvoicePairDetailEntity[];
    }>,
    queryRunner: QueryRunner
  ): Promise<SubDistributorStockHistoryEntity[]> {
    if (!entries.length) return Promise.resolve([]);

    const repository = queryRunner.manager.getRepository(SubDistributorStockHistoryEntity);
    return repository.save(
      entries.map((entry) =>
        repository.create({
          subDistributor: { id: Number(entry.subDistributorId) } as any,
          invoice: { id: Number(entry.invoiceId) } as any,
          item_code: entry.itemCode,
          item_name: entry.itemName ?? undefined,
          quantity_added: entry.quantityAdded,
          total_quantity_after: entry.totalQuantityAfter,
          submission_id: entry.submissionId,
          details: entry.pairs.map((pair) => ({
            pair,
            pair_uid: pair.pair_uid,
          })) as any,
        })
      )
    );
  }

  /**
   * Paginated audit trail for one sub-distributor, newest first — each row is one SKU
   * credited in one submission, with its source invoice and contributing pairs.
   *
   * `details` is one-to-many, so this pages over history ids first (no one-to-many join),
   * then re-fetches just those ids with `details` joined in a second, unpaginated query —
   * joining details directly into a paginated query would multiply rows and corrupt
   * getManyAndCount()'s totals/skip/take (same pattern as the distributor-return repos).
   */
  async listStockHistory(
    subDistributorId: string,
    page: number,
    limit: number
  ): Promise<{ items: SubDistributorStockHistoryEntity[]; total: number }> {
    const repository = this.repository.manager.getRepository(SubDistributorStockHistoryEntity);

    const idQb = repository
      .createQueryBuilder('history')
      .where('history.sub_distributor_id = :subDistributorId', { subDistributorId })
      .orderBy('history.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [idRows, total] = await idQb.getManyAndCount();
    if (!idRows.length) {
      return { items: [], total };
    }

    const items = await repository
      .createQueryBuilder('history')
      .innerJoin('history.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no'])
      .leftJoin('history.details', 'details')
      .addSelect(['details.id', 'details.pair_uid'])
      .where('history.id IN (:...ids)', { ids: idRows.map((row) => row.id) })
      .orderBy('history.id', 'DESC')
      .getMany();

    return { items, total };
  }
}
