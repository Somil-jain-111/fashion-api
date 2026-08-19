import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, EntityManager, In, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { PairScanHistoryEntity } from '../entities/pair-scan-history.entity';
import { InvoiceScanAuditEntity } from '../entities/invoice-scan-audit.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
import { PairHistoryStatus, ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { User } from 'src/modules/auth/entities';
import { PointHistory } from 'src/modules/redemptions/entities/point-history.entity';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';

@Injectable()
export class InvoiceRepository extends BaseRepository<InvoiceEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceEntity));
  }

  findOwnedByNumber(invoiceNumber: string, userId: string, manager?: EntityManager) {
    return (manager?.getRepository(InvoiceEntity) ?? this.repository)
      .createQueryBuilder('invoice')
      .select([
        'invoice.id',
        'invoice.invoice_no',
        'invoice.invoice_date',
        'invoice.status',
        'invoice.scan_status',
        'invoice.total_pairs',
        'invoice.scanned_pairs',
        'invoice.allocated_points',
        'invoice.earned_points',
        'invoice.invoice_type',
        'invoice.expires_at',
      ])
      .innerJoin('invoice.user', 'user')
      .where('invoice.invoice_no = :invoiceNumber', { invoiceNumber })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }

  findByIdForUpdate(invoiceId: string, manager: EntityManager): Promise<InvoiceEntity> {
    return manager
      .getRepository(InvoiceEntity)
      .createQueryBuilder('invoice')
      .setLock('pessimistic_write')
      .where('invoice.id = :invoiceId', { invoiceId })
      .getOneOrFail();
  }

  saveInvoice(invoice: InvoiceEntity, manager?: EntityManager): Promise<InvoiceEntity> {
    return (manager?.getRepository(InvoiceEntity) ?? this.repository).save(invoice);
  }
}

@Injectable()
export class InvoiceSessionRepository extends BaseRepository<InvoiceScanSessionEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceScanSessionEntity));
  }

  findActive(invoiceId: string, userId: string, manager?: EntityManager) {
    return (manager?.getRepository(InvoiceScanSessionEntity) ?? this.repository).findOne({
      where: { invoiceId, userId, status: ScanSessionStatus.ACTIVE },
    });
  }

  createSession(
    data: Partial<InvoiceScanSessionEntity>,
    manager?: EntityManager
  ): Promise<InvoiceScanSessionEntity> {
    const repository = manager?.getRepository(InvoiceScanSessionEntity) ?? this.repository;
    return repository.save(repository.create(data));
  }

  findOwned(sessionId: string, userId: string, manager?: EntityManager, forUpdate = false) {
    let query = (manager?.getRepository(InvoiceScanSessionEntity) ?? this.repository)
      .createQueryBuilder('session')
      .where('session.session_id = :sessionId', { sessionId })
      .andWhere('session.user_id = :userId', { userId });
    if (forUpdate) query = query.setLock('pessimistic_write');
    return query.getOne();
  }

  saveSession(
    session: InvoiceScanSessionEntity,
    manager?: EntityManager
  ): Promise<InvoiceScanSessionEntity> {
    return (manager?.getRepository(InvoiceScanSessionEntity) ?? this.repository).save(session);
  }
}

@Injectable()
export class PairHistoryRepository extends BaseRepository<PairScanHistoryEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(PairScanHistoryEntity));
  }

  existing(invoiceId: string, pairUids: string[], manager?: EntityManager) {
    if (!pairUids.length) return Promise.resolve([]);
    return (manager?.getRepository(PairScanHistoryEntity) ?? this.repository).find({
      select: { pairUid: true },
      where: { invoiceId, pairUid: In(pairUids) },
    });
  }

  pendingValid(sessionId: string, manager: EntityManager) {
    return manager.getRepository(PairScanHistoryEntity).find({
      where: { sessionId, status: PairHistoryStatus.VALID },
      order: { id: 'ASC' },
    });
  }

  async insertIgnore(rows: Partial<PairScanHistoryEntity>[]): Promise<void> {
    if (!rows.length) return;
    await this.repository
      .createQueryBuilder('history')
      .insert()
      .into(PairScanHistoryEntity)
      .values(rows)
      .orIgnore()
      .execute();
  }

  async countBySession(sessionId: string): Promise<{
    scanned: number;
    valid: number;
    invalid: number;
  }> {
    const counts = await this.repository
      .createQueryBuilder('history')
      .select('COUNT(*)', 'scanned')
      .addSelect('SUM(CASE WHEN history.status IN (:...validStatuses) THEN 1 ELSE 0 END)', 'valid')
      .addSelect('SUM(CASE WHEN history.status = :invalidStatus THEN 1 ELSE 0 END)', 'invalid')
      .where('history.session_id = :sessionId', { sessionId })
      .setParameters({
        validStatuses: [PairHistoryStatus.VALID, PairHistoryStatus.REWARDED],
        invalidStatus: PairHistoryStatus.INVALID,
      })
      .getRawOne();
    return {
      scanned: Number(counts?.scanned ?? 0),
      valid: Number(counts?.valid ?? 0),
      invalid: Number(counts?.invalid ?? 0),
    };
  }

  async markRewarded(ids: string[], manager: EntityManager): Promise<void> {
    if (!ids.length) return;
    await manager
      .getRepository(PairScanHistoryEntity)
      .update({ id: In(ids) }, { status: PairHistoryStatus.REWARDED });
  }

  async findPageBySession(
    sessionId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: PairScanHistoryEntity[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { sessionId, userId },
      select: ['id', 'pairUid', 'status', 'scanSource', 'failureReason', 'createdAt'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  findBySession(sessionId: string, userId: string): Promise<PairScanHistoryEntity[]> {
    return this.repository.find({
      where: { sessionId, userId },
      order: { id: 'ASC' },
    });
  }

  /**
   * Purges the per-pair scan log for a session. Only call this once the session is
   * COMPLETED — countBySession()/pendingValid() both read every row for a session to
   * track cumulative progress across partial submits, so deleting mid-session would
   * corrupt an in-progress MULTIPLE-type invoice's scanned/valid counts.
   */
  async deleteBySession(sessionId: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(PairScanHistoryEntity).delete({ sessionId });
  }

    async deleteOneActive(sessionId: string, pairUid: string): Promise<boolean> {
    const result = await this.repository.delete({
      sessionId,
      pairUid,
      status: In([PairHistoryStatus.VALID, PairHistoryStatus.INVALID]),
    });
    return (result.affected ?? 0) > 0;
  }

    async deleteAllActiveBySession(sessionId: string): Promise<string[]> {
    const rows = await this.repository.find({
      where: { sessionId, status: In([PairHistoryStatus.VALID, PairHistoryStatus.INVALID]) },
      select: ['pairUid'],
    });
    if (!rows.length) return [];
    await this.repository.delete({
      sessionId,
      status: In([PairHistoryStatus.VALID, PairHistoryStatus.INVALID]),
    });
    return rows.map((row) => row.pairUid);
  }
}

@Injectable()
export class InvoiceHistoryRepository extends BaseRepository<InvoiceScanAuditEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceScanAuditEntity));
  }

  saveHistory(
    data: Partial<InvoiceScanAuditEntity>,
    manager?: EntityManager
  ): Promise<InvoiceScanAuditEntity> {
    const repository = manager?.getRepository(InvoiceScanAuditEntity) ?? this.repository;
    return repository.save(repository.create(data));
  }

  findOwnedById(id: string, userId: string): Promise<InvoiceScanAuditEntity | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findHistory(
    userId: string,
    filters: {
      invoiceNumber?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ items: InvoiceScanAuditEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('history')
      .where('history.user_id = :userId', { userId });
    if (filters.invoiceNumber) {
      query.andWhere('history.invoice_number = :invoiceNumber', {
        invoiceNumber: filters.invoiceNumber,
      });
    }
    if (filters.status) query.andWhere('history.status = :status', { status: filters.status });
    if (filters.fromDate) {
      query.andWhere('history.created_at >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      query.andWhere('history.created_at <= :toDate', { toDate: filters.toDate });
    }
    const [items, total] = await query
      .orderBy('history.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
    return { items, total };
  }

  /**
   * Purges every audit entry (STARTED/PARTIALLY_SUBMITTED/COMPLETED/...) recorded for a
   * session. Only call once the session is COMPLETED — this removes the invoice from the
   * retailer's GET /invoices/history and /history/:id views, by design (per product
   * decision to not retain history for fully-completed invoices).
   */
  async deleteBySession(sessionId: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(InvoiceScanAuditEntity).delete({ sessionId });
  }
}

@Injectable()
export class InvoicePairRepository extends BaseRepository<InvoicePairDetailEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoicePairDetailEntity));
  }

  findForInvoice(invoiceId: string, pairUids: string[], queryRunner?: QueryRunner) {
    if (!pairUids.length) return Promise.resolve([]);
    return this.createQueryBuilder('pair', queryRunner)
      .select(['pair.id', 'pair.pair_uid', 'pair.status'])
      .innerJoin('pair.assortment', 'assortment')
      .where('assortment.invoice_id = :invoiceId', { invoiceId })
      .andWhere('pair.pair_uid IN (:...pairUids)', { pairUids })
      .getMany();
  }

  /**
   * Marks the given physical pairs as consumed on invoice_pair_details itself (the
   * source-of-truth table with its own scanned_by/scanned_at audit columns), rather than
   * relying solely on pair_scan_history for anti-replay protection. Scoped by invoiceId so a
   * pair_uid string can never be marked against the wrong invoice.
   */
  async markStatusByUids(
    invoiceId: string,
    pairUids: string[],
    status: InvoicePairScanStatus,
    scannedBy: string,
    manager?: EntityManager
  ): Promise<void> {
    if (!pairUids.length) return;
    const repository = manager?.getRepository(InvoicePairDetailEntity) ?? this.repository;
    const pairs = await repository
      .createQueryBuilder('pair')
      .select(['pair.id'])
      .innerJoin('pair.assortment', 'assortment')
      .where('assortment.invoice_id = :invoiceId', { invoiceId })
      .andWhere('pair.pair_uid IN (:...pairUids)', { pairUids })
      .getMany();
    if (!pairs.length) return;
    await repository.update(
      { id: In(pairs.map((pair) => pair.id)) },
      { status, scanned_by: scannedBy, scanned_at: new Date() }
    );
  }

   async revertStatusByUids(
    invoiceId: string,
    pairUids: string[],
    manager?: EntityManager
  ): Promise<void> {
    if (!pairUids.length) return;
    const repository = manager?.getRepository(InvoicePairDetailEntity) ?? this.repository;
    const pairs = await repository
      .createQueryBuilder('pair')
      .select(['pair.id'])
      .innerJoin('pair.assortment', 'assortment')
      .where('assortment.invoice_id = :invoiceId', { invoiceId })
      .andWhere('pair.pair_uid IN (:...pairUids)', { pairUids })
      .getMany();
    if (!pairs.length) return;
    await repository.update(
      { id: In(pairs.map((pair) => pair.id)) },
      { status: InvoicePairScanStatus.UNSCANNED, scanned_by: null, scanned_at: null }
    );
  }

  /**
   * Single query replacing the old findItemCodesForPairs + countScannedByItemCode pair —
   * both hit the same pair-joined-to-assortment scan for the invoice, so they're merged
   * into one round trip: fetch only the candidate pairs plus whatever is already scanned
   * (not the whole invoice), then derive the item-code map and per-item scanned counts
   * in memory instead of running two separate DB scans for large invoices.
   */
  async getPairScanContext(
    invoiceId: string,
    pairUids: string[],
  ): Promise<{ itemCodeByPair: Map<string, string>; alreadyScanned: Map<string, number> }> {
    const scannedStatuses = [InvoicePairScanStatus.SCANNED, InvoicePairScanStatus.REDEEMED];

    const rows = await this.repository
      .createQueryBuilder('pair')
      .select('pair.pair_uid', 'pairUid')
      .addSelect('assortment.parent_item_code', 'itemCode')
      .addSelect('pair.status', 'status')
      .innerJoin('pair.assortment', 'assortment')
      .where('assortment.invoice_id = :invoiceId', { invoiceId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('pair.status IN (:...scannedStatuses)', { scannedStatuses });
          if (pairUids.length) {
            qb.orWhere('pair.pair_uid IN (:...pairUids)', { pairUids });
          }
        }),
      )
      .getRawMany();

    const candidateUids = new Set(pairUids);
    const itemCodeByPair = new Map<string, string>();
    const alreadyScanned = new Map<string, number>();

    for (const row of rows) {
      if (candidateUids.has(row.pairUid)) {
        itemCodeByPair.set(row.pairUid, row.itemCode);
      }
      if (scannedStatuses.includes(row.status)) {
        alreadyScanned.set(row.itemCode, (alreadyScanned.get(row.itemCode) ?? 0) + 1);
      }
    }

    return { itemCodeByPair, alreadyScanned };
  }
}

@Injectable()
export class UserRewardRepository {
  constructor(private readonly dataSource: DataSource) {}

  async addPoints(userId: string, points: number, manager: EntityManager): Promise<number> {
    const repository = manager.getRepository(User);
    await repository.increment({ id: Number(userId) }, 'points', points);
    const user = await repository.findOne({
      select: { id: true, points: true },
      where: { id: Number(userId) },
    });
    return Number(user?.points ?? 0);
  }

   async deductPoints(userId: string, points: number, manager: EntityManager): Promise<number> {
    if (points <= 0) return this.currentBalance(userId, manager);
    const repository = manager.getRepository(User);
    const current = await this.currentBalance(userId, manager);
    const deduction = Math.min(current, points);
    if (deduction > 0) await repository.decrement({ id: Number(userId) }, 'points', deduction);
    return this.currentBalance(userId, manager);
  }

  private async currentBalance(userId: string, manager: EntityManager): Promise<number> {
    const repository = manager.getRepository(User);
    const user = await repository.findOne({
      select: { id: true, points: true },
      where: { id: Number(userId) },
    });
    return Number(user?.points ?? 0);
  }
}

@Injectable()
export class InvoicePointHistoryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createEarnHistory(
    data: {
      userId: string;
      points: number;
      balance: number;
      transactionId: string;
      description: string;
      expiresAt?: Date; 
    },
    manager: EntityManager
  ): Promise<PointHistory> {
    const repository = manager.getRepository(PointHistory);
    return repository.save(
      repository.create({
        user: { id: Number(data.userId) } as User,
        points: data.points,
        description: data.description,
        type: RedemptionType.EARN,
        status: PointStatusEnum.added,
        date: new Date(),
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        user_remaining_points: data.balance,
        transaction_id: data.transactionId,
        expires_at: data.expiresAt,
        remaining_points: data.points,
      })
    );
  }

    async findExpirable(asOf: Date, manager: EntityManager): Promise<PointHistory[]> {
    return manager
      .getRepository(PointHistory)
      .createQueryBuilder('history')
      .where('history.status = :status', { status: PointStatusEnum.added })
      .andWhere('history.expires_at IS NOT NULL')
      .andWhere('history.expires_at <= :asOf', { asOf })
      .andWhere('history.remaining_points > 0')
      .getMany();
  }

  async markExpired(id: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(PointHistory)
      .update({ id } as any, { status: PointStatusEnum.expired, remaining_points: 0 } as any);
  }
}
