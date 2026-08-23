import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { User } from 'src/modules/auth/entities/users.entity';
import { UserMapping } from 'src/modules/auth/entities/user-mapping.entity';
import { MappingStatus, MappingType } from 'src/default/common/enums/user-mapping.enum';
import { InvoiceEntity } from 'src/modules/invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from 'src/modules/invoices/entities/invoice-pair-detail.entity';
import { InvoicePairScanStatus } from 'src/modules/invoices/enum/invoice-pair-scan-status.enum';
import { InvoiceItemEntity } from 'src/modules/invoices/entities/invoice-item.entity';
import { PointHistory } from 'src/modules/redemptions/entities/point-history.entity';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { DistributorReturnEntity } from '../entities/distributor-return.entity';
import { DistributorReturnDetailEntity } from '../entities/distributor-return-detail.entity';

@Injectable()
export class DistributorReturnRepository extends BaseRepository<DistributorReturnEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource.getRepository(DistributorReturnEntity));
  }

  findDistributor(distributorId: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({
      select: { id: true, code: true },
      where: { id: Number(distributorId) },
    });
  }

  /**
   * Looks the pair up on its own — the invoice is derived from it (via its assortment)
   * rather than taken as input. A physical QR scan may decode to either pair_uid or the
   * pair_qr payload depending on the scanner/label, so both columns are matched.
   */
  findPairByCode(pairCode: string, manager?: EntityManager) {
    return (
      manager?.getRepository(InvoicePairDetailEntity) ??
      this.dataSource.getRepository(InvoicePairDetailEntity)
    )
      .createQueryBuilder('pair')
      .innerJoin('pair.assortment', 'assortment')
      .innerJoin('assortment.invoice', 'assortmentInvoice')
      .addSelect(['assortment.id', 'assortmentInvoice.id', 'assortment.parent_item_code'])
      .where('(pair.pair_uid = :pairCode OR pair.pair_qr = :pairCode)', { pairCode })
      .getOne();
  }

  /**
   * invoice_assortments only carries the item code (parent_item_code), not a direct FK to
   * invoice_items — join on (invoice_id, item_code) to resolve the product name for display.
   */
  findProductForPair(
    invoiceId: string,
    itemCode: string,
    manager?: EntityManager
  ): Promise<InvoiceItemEntity | null> {
    return (
      manager?.getRepository(InvoiceItemEntity) ?? this.dataSource.getRepository(InvoiceItemEntity)
    )
      .createQueryBuilder('item')
      .select(['item.id', 'item.item_code', 'item.item_name'])
      .where('item.invoice_id = :invoiceId', { invoiceId })
      .andWhere('item.item_code = :itemCode', { itemCode })
      .getOne();
  }

  /**
   * `forUpdate` locks both the invoice row and the joined retailer/user row in one query,
   * since a SELECT ... FOR UPDATE with a join locks every table it touches in MySQL. Safe to
   * call repeatedly for the same invoice within one transaction (e.g. two pairs from the same
   * invoice in one batch) — MySQL row locks are re-entrant for the holding transaction.
   */
  findInvoiceById(invoiceId: string, manager?: EntityManager, forUpdate = false) {
    const query = (
      manager?.getRepository(InvoiceEntity) ?? this.dataSource.getRepository(InvoiceEntity)
    )
      .createQueryBuilder('invoice')
      .innerJoinAndSelect('invoice.user', 'retailer')
      .where('invoice.id = :invoiceId', { invoiceId });

    if (forUpdate) {
      query.setLock('pessimistic_write');
    }

    return query.getOne();
  }

  saveInvoice(invoice: InvoiceEntity, manager: EntityManager): Promise<InvoiceEntity> {
    return manager.getRepository(InvoiceEntity).save(invoice);
  }

  findExistingReturnForPair(pairId: string, manager?: EntityManager) {
    return (manager?.getRepository(DistributorReturnDetailEntity) ??
      this.dataSource.getRepository(DistributorReturnDetailEntity))
      .createQueryBuilder('detail')
      .innerJoinAndSelect('detail.return', 'return')
      .where('detail.pair_id = :pairId', { pairId })
      .getOne();
  }

  findExistingByReturnNo(returnNo: string, manager: EntityManager) {
    return manager
      .getRepository(DistributorReturnEntity)
      .findOne({ where: { return_no: returnNo } });
  }

  /**
   * Creates one return row for one invoice, with its pair details nested (cascade-saved in
   * the same insert).
   */
  saveReturn(
    data: {
      return_no: string;
      invoice: InvoiceEntity;
      retailer: User;
      distributor: { id: number };
      total_pairs: number;
      total_points_refunded: number;
      remarks?: string;
      details: { pair: InvoicePairDetailEntity; pair_uid: string; points_refunded: number }[];
    },
    manager: EntityManager
  ): Promise<DistributorReturnEntity> {
    const repository = manager.getRepository(DistributorReturnEntity);
    return repository.save(
      repository.create({
        return_no: data.return_no,
        invoice: data.invoice,
        retailer: data.retailer,
        distributor: data.distributor as User,
        total_pairs: data.total_pairs,
        total_points_refunded: data.total_points_refunded,
        remarks: data.remarks,
        details: data.details.map((detail) => ({
          pair: detail.pair,
          pair_uid: detail.pair_uid,
          points_refunded: detail.points_refunded,
        })) as DistributorReturnDetailEntity[],
      })
    );
  }

  updateRetailerPoints(retailerId: string, points: bigint, manager: EntityManager) {
    return manager.getRepository(User).update({ id: Number(retailerId) }, { points });
  }

  savePointHistory(
    data: {
      retailerId: string;
      points: number;
      balance: number;
      transactionId: string;
      description: string;
    },
    manager: EntityManager
  ): Promise<PointHistory> {
    const repository = manager.getRepository(PointHistory);
    return repository.save(
      repository.create({
        user: { id: Number(data.retailerId) } as User,
        points: data.points,
        description: data.description,
        type: RedemptionType.REDEMPTION,
        status: PointStatusEnum.refund,
        date: new Date(),
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        user_remaining_points: data.balance,
        transaction_id: data.transactionId,
      })
    );
  }

  /**
   * Shared shape for every return list/detail query — joins all the way down to the product
   * (name/mrp) and size code for each returned pair, since both the distributor-facing and
   * retailer-facing screens need an itemized/estimated-value view, not just the pairs list.
   */
  private baseHistoryQuery() {
    return this.repository
      .createQueryBuilder('return')
      .innerJoin('return.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name', 'invoice.invoice_date'])
      .innerJoin('return.retailer', 'retailer')
      .addSelect(['retailer.id', 'retailer.firmName', 'retailer.username', 'retailer.mobile', 'retailer.code'])
      .leftJoin('retailer.storeInformation', 'retailerStore')
      .addSelect(['retailerStore.city', 'retailerStore.state'])
      .innerJoin('return.distributor', 'distributor')
      .addSelect(['distributor.id', 'distributor.firmName', 'distributor.username', 'distributor.mobile'])
      .leftJoin('return.details', 'details')
      .addSelect(['details.id', 'details.pair_uid', 'details.points_refunded'])
      .leftJoin('details.pair', 'pair')
      .addSelect(['pair.id'])
      .leftJoin('pair.assortment', 'assortment')
      .addSelect(['assortment.id', 'assortment.packing_item_code'])
      .leftJoin('assortment.item', 'item')
      .addSelect(['item.id', 'item.item_name', 'item.item_code', 'item.mrp']);
  }

  /**
   * `retailerId` scopes to one retailer's returns (the "retailer-wise return" list); `search`
   * matches the return number or the source invoice number (the "all return" history search box).
   */
  private historyFilterQuery(
    qb: SelectQueryBuilder<DistributorReturnEntity>,
    distributorId: string,
    retailerId?: string,
    search?: string
  ) {
    qb.where('return.distributor_id = :distributorId', { distributorId });
    if (retailerId) {
      qb.andWhere('return.retailer_id = :retailerId', { retailerId });
    }
    if (search) {
      qb.innerJoin('return.invoice', 'searchInvoice').andWhere(
        '(return.return_no LIKE :search OR searchInvoice.invoice_no LIKE :search)',
        { search: `%${search}%` }
      );
    }
    return qb;
  }

  async findHistoryForDistributor(
    distributorId: string,
    page: number,
    limit: number,
    retailerId?: string,
    search?: string
  ): Promise<{ items: DistributorReturnEntity[]; total: number; totalArticles: number }> {
    const idQb = this.historyFilterQuery(
      this.repository.createQueryBuilder('return'),
      distributorId,
      retailerId,
      search
    )
      .orderBy('return.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [idRows, total] = await idQb.getManyAndCount();

    const totalsRow = await this.historyFilterQuery(
      this.repository
        .createQueryBuilder('return')
        .select('COALESCE(SUM(return.total_pairs), 0)', 'totalArticles'),
      distributorId,
      retailerId,
      search
    ).getRawOne();
    const totalArticles = Number(totalsRow?.totalArticles ?? 0);

    if (!idRows.length) {
      return { items: [], total, totalArticles };
    }

    const items = await this.baseHistoryQuery()
      .where('return.id IN (:...ids)', { ids: idRows.map((row) => row.id) })
      .orderBy('return.id', 'DESC')
      .getMany();

    return { items, total, totalArticles };
  }

  /**
   * Full single-return detail for the Return Summary screen's itemized product list.
   */
  findReturnDetail(id: string, distributorId: string) {
    return this.baseHistoryQuery()
      .where('return.id = :id', { id })
      .andWhere('return.distributor_id = :distributorId', { distributorId })
      .getOne();
  }

  /**
   * Retailer-facing mirror of `historyFilterQuery` — scopes to the retailer's own returns
   * across ALL distributors, rather than one distributor's returns across all retailers.
   */
  private retailerHistoryFilterQuery(
    qb: SelectQueryBuilder<DistributorReturnEntity>,
    retailerId: string,
    search?: string,
    startDate?: string,
    endDate?: string
  ) {
    qb.where('return.retailer_id = :retailerId', { retailerId });
    if (search) {
      qb.innerJoin('return.invoice', 'searchInvoice').andWhere(
        '(return.return_no LIKE :search OR searchInvoice.invoice_no LIKE :search)',
        { search: `%${search}%` }
      );
    }
    if (startDate) {
      qb.andWhere('return.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      // Inclusive of the whole end day — endDate arrives as a bare date (YYYY-MM-DD).
      qb.andWhere('return.created_at < :endDateExclusive', {
        endDateExclusive: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
      });
    }
    return qb;
  }

  async findReturnsForRetailer(
    retailerId: string,
    page: number,
    limit: number,
    search?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ items: DistributorReturnEntity[]; total: number; totalArticles: number }> {
    const idQb = this.retailerHistoryFilterQuery(
      this.repository.createQueryBuilder('return'),
      retailerId,
      search,
      startDate,
      endDate
    )
      .orderBy('return.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [idRows, total] = await idQb.getManyAndCount();

    const totalsRow = await this.retailerHistoryFilterQuery(
      this.repository.createQueryBuilder('return').select('COALESCE(SUM(return.total_pairs), 0)', 'totalArticles'),
      retailerId,
      search,
      startDate,
      endDate
    ).getRawOne();
    const totalArticles = Number(totalsRow?.totalArticles ?? 0);

    if (!idRows.length) {
      return { items: [], total, totalArticles };
    }

    const items = await this.baseHistoryQuery()
      .where('return.id IN (:...ids)', { ids: idRows.map((row) => row.id) })
      .orderBy('return.id', 'DESC')
      .getMany();

    return { items, total, totalArticles };
  }

  findReturnDetailForRetailer(id: string, retailerId: string) {
    return this.baseHistoryQuery()
      .where('return.id = :id', { id })
      .andWhere('return.retailer_id = :retailerId', { retailerId })
      .getOne();
  }

  /**
   * Retailers mapped to this distributor via user_mappings (parent = distributor,
   * child = retailer). Filters on both the enum `status` and the inherited boolean `active` —
   * the codebase writes mappings through two different paths that don't always agree on which
   * one they set.
   */
  async findMappedRetailers(
    distributorId: string,
    page: number,
    limit: number,
    search?: string
  ): Promise<{ rows: UserMapping[]; total: number }> {
    const qb = this.dataSource
      .getRepository(UserMapping)
      .createQueryBuilder('mapping')
      .innerJoin('mapping.child', 'retailer')
      .addSelect(['retailer.id', 'retailer.firmName', 'retailer.username', 'retailer.mobile', 'retailer.code'])
      .leftJoin('retailer.storeInformation', 'store')
      .addSelect(['store.city', 'store.state'])
      .where('mapping.parent_user_id = :distributorId', { distributorId })
      .andWhere('mapping.mapping_type IN (:...types)', {
        types: [MappingType.RETAILER_DISTRIBUTOR, MappingType.RETAILER_SUB_DISTRIBUTOR],
      })
      .andWhere('mapping.status = :status', { status: MappingStatus.ACTIVE })
      .andWhere('mapping.active = true')
      .orderBy('mapping.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('(retailer.firmName LIKE :search OR retailer.username LIKE :search OR retailer.code LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  /**
   * Count of REDEEMED pairs, per retailer, that belong to this distributor's invoices and
   * haven't been returned yet — the "Total Articles" figure on the retailer list, i.e. what's
   * actually eligible to be returned right now.
   */
  async countReturnableArticles(
    distributorCode: string,
    retailerIds: number[]
  ): Promise<Map<number, number>> {
    if (!retailerIds.length) {
      return new Map();
    }
    const rows = await this.dataSource
      .getRepository(InvoicePairDetailEntity)
      .createQueryBuilder('pair')
      .innerJoin('pair.invoice', 'invoice')
      .leftJoin(
        DistributorReturnDetailEntity,
        'returned',
        'returned.pair_id = pair.id'
      )
      .select('invoice.user_id', 'retailerId')
      .addSelect('COUNT(pair.id)', 'count')
      .where('pair.status = :status', { status: InvoicePairScanStatus.REDEEMED })
      .andWhere('invoice.master_id = :distributorCode', { distributorCode })
      .andWhere('invoice.user_id IN (:...retailerIds)', { retailerIds })
      .andWhere('returned.id IS NULL')
      .groupBy('invoice.user_id')
      .getRawMany();

    return new Map(rows.map((row) => [Number(row.retailerId), Number(row.count)]));
  }
}
