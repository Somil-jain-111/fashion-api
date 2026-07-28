import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { PairScanHistoryEntity } from '../entities/pair-scan-history.entity';
import { InvoiceScanAuditEntity } from '../entities/invoice-scan-audit.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
import { PairHistoryStatus, ScanSessionStatus } from '../enum/invoice-scan-session.enum';
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
      })
    );
  }
}
