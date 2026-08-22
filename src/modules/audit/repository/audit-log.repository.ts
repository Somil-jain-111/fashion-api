import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AuditAction } from '../enum/audit-action.enum';

export interface ListAuditLogsFilters {
  module?: string;
  entityId?: string;
  action?: AuditAction;
  performedBy?: number;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly dataSource: DataSource) {}

  private baseQuery() {
    return this.dataSource
      .getRepository(AuditLogEntity)
      .createQueryBuilder('log')
      .innerJoin('log.performedByUser', 'admin')
      .addSelect(['admin.id', 'admin.firmName', 'admin.username']);
  }

  save(data: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const repository = this.dataSource.getRepository(AuditLogEntity);
    return repository.save(repository.create(data));
  }

  async list(filters: ListAuditLogsFilters): Promise<{ items: AuditLogEntity[]; total: number }> {
    const qb = this.baseQuery()
      .orderBy('log.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.module) {
      qb.andWhere('log.module = :module', { module: filters.module });
    }
    if (filters.entityId) {
      qb.andWhere('log.entity_id = :entityId', { entityId: filters.entityId });
    }
    if (filters.action) {
      qb.andWhere('log.action = :action', { action: filters.action });
    }
    if (filters.performedBy) {
      qb.andWhere('log.performed_by = :performedBy', { performedBy: filters.performedBy });
    }
    if (filters.fromDate) {
      qb.andWhere('log.created_at >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('log.created_at <= :toDate', { toDate: filters.toDate });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
