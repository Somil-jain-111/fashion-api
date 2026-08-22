import { Injectable } from '@nestjs/common';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditAction } from './enum/audit-action.enum';
import { AuditLogRepository } from './repository/audit-log.repository';
import { ListAuditLogsQueryDto } from './dto';

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditLogRepository) {}

  recordCreate(module: string, entityId: string, adminId: string, snapshot: Record<string, unknown>) {
    return this.repository.save({
      module,
      entity_id: entityId,
      action: AuditAction.CREATE,
      changes: snapshot,
      performed_by: adminId,
    });
  }

  /**
   * Diffs `before` against `after` and stores only the fields that actually changed, as
   * { field: { from, to } } — so "what key was updated" is answerable straight from the log
   * row instead of re-deriving it from two full snapshots.
   */
  async recordUpdate(
    module: string,
    entityId: string,
    adminId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ) {
    const changes = this.diff(before, after);
    if (!Object.keys(changes).length) {
      return;
    }
    return this.repository.save({
      module,
      entity_id: entityId,
      action: AuditAction.UPDATE,
      changes,
      performed_by: adminId,
    });
  }

  recordDelete(module: string, entityId: string, adminId: string, snapshot?: Record<string, unknown>) {
    return this.repository.save({
      module,
      entity_id: entityId,
      action: AuditAction.DELETE,
      changes: snapshot ?? null,
      performed_by: adminId,
    });
  }

  async list(query: ListAuditLogsQueryDto) {
    const { items, total } = await this.repository.list({
      module: query.module,
      entityId: query.entityId,
      action: query.action,
      performedBy: query.performedBy,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: new AddressPaginationDTO(total, Math.ceil(total / query.limit), query.page, query.limit),
    };
  }

  private diff(
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(after)) {
      if (key === 'id' || key === 'updatedAt' || key === 'createdAt') {
        continue;
      }
      const before_ = before[key];
      const after_ = after[key];
      if (JSON.stringify(before_) !== JSON.stringify(after_)) {
        changes[key] = { from: before_ ?? null, to: after_ ?? null };
      }
    }
    return changes;
  }

  private toResponse(log: AuditLogEntity) {
    return {
      id: log.id,
      module: log.module,
      entityId: log.entity_id,
      action: log.action,
      changes: log.changes,
      performedBy: {
        id: log.performedByUser?.id,
        name: log.performedByUser?.firmName || log.performedByUser?.username,
      },
      createdAt: log.created_at,
    };
  }
}
