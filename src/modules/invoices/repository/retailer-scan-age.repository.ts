import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RetailerScanAgeConfigEntity } from '../entities/retailer-scan-age-config.entity';
import { RetailerScanAgeAuditEntity } from '../entities/retailer-scan-age-audit.entity';

@Injectable()
export class RetailerScanAgeRepository {
  constructor(private readonly dataSource: DataSource) {}

  findOverride(retailerId: string, manager?: EntityManager) {
    return (
      manager?.getRepository(RetailerScanAgeConfigEntity) ??
      this.dataSource.getRepository(RetailerScanAgeConfigEntity)
    ).findOne({
      where: {
        retailer: { id: Number(retailerId) },
      },
    });
  }

  async upsertOverride(
    retailerId: string,
    scanAgeDays: number,
    updatedBy: string,
    manager: EntityManager
  ): Promise<void> {
    const repo = manager.getRepository(RetailerScanAgeConfigEntity);

    const existing = await repo.findOne({
      where: {
        retailer: { id: Number(retailerId) },
      },
    });

    if (existing) {
      existing.scanAgeDays = scanAgeDays;
      existing.updatedByUser = { id: Number(updatedBy) } as any;

      await repo.save(existing);
    } else {
      await repo.save(
        repo.create({
          retailer: { id: Number(retailerId) } as any,
          scanAgeDays,
          updatedByUser: { id: Number(updatedBy) } as any,
        })
      );
    }
  }

  async writeAuditLog(
    data: {
      retailerId: string;
      oldValue: number;
      newValue: number;
      changedBy: string;
      reason: string;
      approvalReference?: string;
    },
    manager: EntityManager
  ): Promise<void> {
    const repo = manager.getRepository(RetailerScanAgeAuditEntity);

    await repo.save(
      repo.create({
        retailer: { id: Number(data.retailerId) } as any,
        oldValue: data.oldValue,
        newValue: data.newValue,
        changedByUser: { id: Number(data.changedBy) } as any,
        reason: data.reason,
        approvalReference: data.approvalReference,
      })
    );
  }

  history(retailerId: string) {
    return this.dataSource.getRepository(RetailerScanAgeAuditEntity).find({
      where: {
        retailer: { id: Number(retailerId) },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}