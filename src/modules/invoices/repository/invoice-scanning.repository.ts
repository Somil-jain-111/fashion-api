import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, In, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { InvoicePairScanHistoryEntity } from '../entities/invoice-pair-scan-history.entity';
import { InvoiceScanAuditEntity } from '../entities/invoice-scan-audit.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
import { InvoiceStatus } from '../enum/invoice.enum';
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

  async findOwnedByNumber(invoiceNumber: string, userId: string, queryRunner?: QueryRunner) {
    return await this.getRepository(queryRunner)
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

  async findByIdForUpdate(invoiceId: string, queryRunner?: QueryRunner): Promise<InvoiceEntity> {
    return await this.getRepository(queryRunner)
      .createQueryBuilder('invoice')
      .setLock('pessimistic_write')
      .where('invoice.id = :invoiceId', { invoiceId })
      .getOneOrFail();
  }

  async saveInvoice(invoice: InvoiceEntity, queryRunner?: QueryRunner): Promise<InvoiceEntity> {
    return await this.save(invoice, queryRunner);
  }

  async getSummary(
    userId: string,
    queryRunner?: QueryRunner
  ): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    completedInvoices: number;
    totalPoints: number;
  }> {
    const raw = await this.getRepository(queryRunner)
      .createQueryBuilder('invoice')
      .select('COUNT(*)', 'totalInvoices')
      .addSelect(
        'SUM(CASE WHEN invoice.status = :completedStatus THEN 1 ELSE 0 END)',
        'completedInvoices'
      )
      .addSelect(
        'SUM(CASE WHEN invoice.status != :completedStatus THEN 1 ELSE 0 END)',
        'pendingInvoices'
      )
      .addSelect('SUM(invoice.earned_points)', 'totalPoints')
      .where('invoice.user_id = :userId', { userId: Number(userId) })
      .setParameter('completedStatus', InvoiceStatus.COMPLETED)
      .getRawOne();

    const totalInvoices = Number(raw?.totalInvoices ?? 0);
    const completedInvoices = Number(raw?.completedInvoices ?? 0);
    const pendingInvoices = Number(raw?.pendingInvoices ?? 0);
    const totalPoints = Number(raw?.totalPoints ?? 0);

    return {
      totalInvoices,
      pendingInvoices,
      completedInvoices,
      totalPoints,
    };
  }
}

@Injectable()
export class InvoiceSessionRepository extends BaseRepository<InvoiceScanSessionEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceScanSessionEntity));
  }

  async findActive(invoiceId: string, userId: string, queryRunner?: QueryRunner) {
    return await this.getRepository(queryRunner).findOne({
      where: {
        invoice: { id: Number(invoiceId) },
        user: { id: Number(userId) },
        status: ScanSessionStatus.ACTIVE,
      },
    });
  }

  async createSession(
    data: Partial<InvoiceScanSessionEntity>,
    queryRunner?: QueryRunner
  ): Promise<InvoiceScanSessionEntity> {
    return await this.save(data, queryRunner);
  }

  async findOwned(sessionId: string, userId: string, queryRunner?: QueryRunner, forUpdate = false) {
    let query = this.getRepository(queryRunner)
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.invoice', 'invoice')
      .where('session.session_id = :sessionId', { sessionId })
      .andWhere('session.user_id = :userId', { userId });

    if (forUpdate) {
      query = query.setLock('pessimistic_write');
    }
    return query.getOne();
  }

  async saveSession(
    session: InvoiceScanSessionEntity,
    queryRunner?: QueryRunner
  ): Promise<InvoiceScanSessionEntity> {
    return await this.save(session, queryRunner);
  }
}

@Injectable()
export class PairHistoryRepository extends BaseRepository<InvoicePairScanHistoryEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoicePairScanHistoryEntity));
  }

  async existing(invoiceId: string, pairUids: string[], queryRunner?: QueryRunner) {
    if (!pairUids.length) {
      return Promise.resolve([]);
    }

    return await this.getRepository(queryRunner).find({
      select: { pairUid: true },
      where: { invoice: { id: Number(invoiceId) }, pairUid: In(pairUids) },
    });
  }

  async pendingValid(sessionId: string, queryRunner?: QueryRunner) {
    return await this.getRepository(queryRunner).find({
      where: { sessionId, status: PairHistoryStatus.VALID },
      order: { id: 'ASC' },
    });
  }

  async insertIgnore(
    rows: Partial<InvoicePairScanHistoryEntity>[],
    queryRunner?: QueryRunner
  ): Promise<void> {
    if (!rows.length) {
      return;
    }

    await this.getRepository(queryRunner)
      .createQueryBuilder('history')
      .insert()
      .into(InvoicePairScanHistoryEntity)
      .values(rows)
      .orIgnore()
      .execute();
  }

  async countBySession(
    sessionId: string,
    queryRunner?: QueryRunner
  ): Promise<{
    scanned: number;
    valid: number;
    invalid: number;
  }> {
    const counts = await this.getRepository(queryRunner)
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

  async markRewarded(ids: string[], queryRunner?: QueryRunner): Promise<void> {
    if (!ids.length) return;
    await this.getRepository(queryRunner).update(
      { id: In(ids) },
      { status: PairHistoryStatus.REWARDED }
    );
  }

  async findPageBySession(
    sessionId: string,
    userId: string,
    page: number,
    limit: number,
    queryRunner?: QueryRunner
  ): Promise<{ items: InvoicePairScanHistoryEntity[]; total: number }> {
    const [items, total] = await this.getRepository(queryRunner).findAndCount({
      where: { sessionId, user: { id: Number(userId) } },
      select: ['id', 'pairUid', 'status', 'scanSource', 'failureReason', 'createdAt'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async findBySession(
    sessionId: string,
    userId: string,
    queryRunner?: QueryRunner
  ): Promise<InvoicePairScanHistoryEntity[]> {
    return await this.getRepository(queryRunner).find({
      where: { sessionId, user: { id: Number(userId) } },
      order: { id: 'ASC' },
    });
  }

  async findByInvoice(invoiceId: string | number, userId: string, queryRunner?: QueryRunner) {
    const rawItems = await this.getRepository(queryRunner)
      .createQueryBuilder('history')
      .leftJoin(InvoicePairDetailEntity, 'pair', 'pair.pair_uid = history.pairUid')
      .leftJoin('pair.assortment', 'assortment', 'assortment.invoice_id = :invoiceId', {
        invoiceId: Number(invoiceId),
      })
      .leftJoin('assortment.item', 'item')
      .select([
        'history.id AS id',
        'history.sessionId AS sessionId',
        'history.pairUid AS pairUid',
        'history.status AS status',
        'history.scanSource AS scanSource',
        'history.failureReason AS failureReason',
        'history.createdAt AS createdAt',
        'item.item_code AS itemCode',
        'item.item_name AS itemName',
        'assortment.parent_item_code AS parentItemCode',
      ])
      .where('history.invoice_id = :invoiceId', { invoiceId: Number(invoiceId) })
      .andWhere('history.user_id = :userId', { userId: Number(userId) })
      .orderBy('history.id', 'ASC')
      .getRawMany();

    return rawItems.map((item) => ({
      id: item.id,
      sessionId: item.sessionId,
      pairUid: item.pairUid,
      status: item.status,
      scanSource: item.scanSource,
      failureReason: item.failureReason,
      createdAt: item.createdAt,
      itemCode: item.itemCode || item.parentItemCode || null,
      itemName: item.itemName || null,
    }));
  }

  async deleteBySession(sessionId: string, queryRunner?: QueryRunner): Promise<void> {
    await this.getRepository(queryRunner).delete({ sessionId });
  }

  async deleteOneActive(
    sessionId: string,
    pairUid: string,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const result = await this.getRepository(queryRunner).delete({
      sessionId,
      pairUid,
      status: In([PairHistoryStatus.VALID, PairHistoryStatus.INVALID]),
    });
    return (result.affected ?? 0) > 0;
  }

  async deleteAllActiveBySession(sessionId: string, queryRunner?: QueryRunner): Promise<string[]> {
    const repository = this.getRepository(queryRunner);
    const rows = await repository.find({
      where: { sessionId, status: In([PairHistoryStatus.VALID, PairHistoryStatus.INVALID]) },
      select: ['pairUid'],
    });
    if (!rows.length) return [];
    await repository.delete({
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

  async saveHistory(
    data: Partial<InvoiceScanAuditEntity>,
    queryRunner?: QueryRunner
  ): Promise<InvoiceScanAuditEntity> {
    return await this.save(data, queryRunner);
  }

  async findOwnedById(
    id: string,
    userId: string,
    queryRunner?: QueryRunner
  ): Promise<InvoiceScanAuditEntity | null> {
    return await this.getRepository(queryRunner).findOne({
      where: { id: Number(id), user: { id: Number(userId) } },
      relations: ['invoice'],
    });
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
    },
    queryRunner?: QueryRunner
  ): Promise<{ items: InvoiceScanAuditEntity[]; total: number }> {
    const query = this.getRepository(queryRunner)
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.invoice', 'invoice')
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

  async deleteBySession(sessionId: string, queryRunner?: QueryRunner): Promise<void> {
    await this.getRepository(queryRunner).delete({ sessionId });
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

  async markStatusByUids(
    invoiceId: string,
    pairUids: string[],
    status: InvoicePairScanStatus,
    scannedBy: string,
    queryRunner?: QueryRunner
  ): Promise<void> {
    if (!pairUids.length) return;
    const repository = this.getRepository(queryRunner);
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
      { status, scannedByUser: { id: Number(scannedBy) } as any, scanned_at: new Date() }
    );
  }

  async revertStatusByUids(
    invoiceId: string,
    pairUids: string[],
    queryRunner?: QueryRunner
  ): Promise<void> {
    if (!pairUids.length) return;
    const repository = this.getRepository(queryRunner);
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
      { status: InvoicePairScanStatus.UNSCANNED, scannedByUser: null as any, scanned_at: null }
    );
  }

  async getPairScanContext(
    invoiceId: string,
    pairUids: string[],
    queryRunner?: QueryRunner
  ): Promise<{ itemCodeByPair: Map<string, string>; alreadyScanned: Map<string, number> }> {
    const scannedStatuses = [InvoicePairScanStatus.SCANNED, InvoicePairScanStatus.REDEEMED];

    const rows = await this.getRepository(queryRunner)
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
        })
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

  findScannedPairsForInvoice(invoiceId: string, queryRunner?: QueryRunner) {
    return this.getRepository(queryRunner)
      .createQueryBuilder('pair')
      .innerJoin('pair.assortment', 'assortment')
      .where('assortment.invoice_id = :invoiceId', { invoiceId })
      .andWhere('pair.status = :status', { status: InvoicePairScanStatus.SCANNED })
      .getMany();
  }

  async markScannedAsRedeemed(
    pairIds: (string | number)[],
    userId: string,
    queryRunner?: QueryRunner
  ): Promise<void> {
    if (!pairIds.length) return;
    await this.getRepository(queryRunner).update(
      { id: In(pairIds) },
      {
        status: InvoicePairScanStatus.REDEEMED,
        scanned_at: new Date(),
        scannedByUser: { id: Number(userId) } as any,
      }
    );
  }
}

@Injectable()
export class UserRewardRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(User));
  }

  async addPoints(userId: string, points: number, queryRunner?: QueryRunner): Promise<number> {
    const repository = this.getRepository(queryRunner);
    await repository.increment({ id: Number(userId) }, 'points', points);
    const user = await repository.findOne({
      select: { id: true, points: true },
      where: { id: Number(userId) },
    });
    return Number(user?.points ?? 0);
  }

  async deductPoints(userId: string, points: number, queryRunner?: QueryRunner): Promise<number> {
    if (points <= 0) return this.currentBalance(userId, queryRunner);
    const repository = this.getRepository(queryRunner);
    const current = await this.currentBalance(userId, queryRunner);
    const deduction = Math.min(current, points);
    if (deduction > 0) await repository.decrement({ id: Number(userId) }, 'points', deduction);
    return this.currentBalance(userId, queryRunner);
  }

  private async currentBalance(userId: string, queryRunner?: QueryRunner): Promise<number> {
    const repository = this.getRepository(queryRunner);
    const user = await repository.findOne({
      select: { id: true, points: true },
      where: { id: Number(userId) },
    });
    return Number(user?.points ?? 0);
  }
}

@Injectable()
export class InvoicePointHistoryRepository extends BaseRepository<PointHistory> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(PointHistory));
  }

  async createEarnHistory(
    data: {
      userId: string;
      points: number;
      balance: number;
      transactionId: string;
      description: string;
      expiresAt?: Date;
      invoiceId?: number;
    },
    queryRunner?: QueryRunner
  ): Promise<PointHistory> {
    const repository = this.getRepository(queryRunner);
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
        invoice: data.invoiceId ? ({ id: Number(data.invoiceId) } as any) : null,
      })
    );
  }

  async findExpirable(asOf: Date, queryRunner?: QueryRunner): Promise<PointHistory[]> {
    return this.getRepository(queryRunner)
      .createQueryBuilder('history')
      .where('history.status = :status', { status: PointStatusEnum.added })
      .andWhere('history.expires_at IS NOT NULL')
      .andWhere('history.expires_at <= :asOf', { asOf })
      .andWhere('history.remaining_points > 0')
      .getMany();
  }

  async markExpired(id: string, queryRunner?: QueryRunner): Promise<void> {
    await this.getRepository(queryRunner).update(
      { id } as any,
      { status: PointStatusEnum.expired, remaining_points: 0 } as any
    );
  }
}
