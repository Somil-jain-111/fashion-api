import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { PairScanHistoryEntity } from '../entities/pair-scan-history.entity';
import { InvoiceScanAuditEntity } from '../entities/invoice-scan-audit.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
import { PairHistoryStatus, ScanSessionStatus } from '../enum/invoice-scan-session.enum';

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

  findOwned(sessionId: string, userId: string, manager?: EntityManager, forUpdate = false) {
    let query = (manager?.getRepository(InvoiceScanSessionEntity) ?? this.repository)
      .createQueryBuilder('session')
      .where('session.session_id = :sessionId', { sessionId })
      .andWhere('session.user_id = :userId', { userId });
    if (forUpdate) query = query.setLock('pessimistic_write');
    return query.getOne();
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
}

@Injectable()
export class InvoiceHistoryRepository extends BaseRepository<InvoiceScanAuditEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceScanAuditEntity));
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
