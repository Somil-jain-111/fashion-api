import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { SellerKycStatus } from 'src/default/common/enums/kyc.enum';
import { SellerKycOverride } from '../entities';

@Injectable()
export class SellerKycOverrideRepository extends BaseRepository<SellerKycOverride> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(SellerKycOverride));
  }

  async findBySellerId(
    sellerId: number,
    manager?: EntityManager
  ): Promise<SellerKycOverride | null> {
    const repository = manager ? manager.getRepository(SellerKycOverride) : this.repository;
    return await repository.findOne({ where: { sellerId } as any });
  }

  async upsert(
    data: {
      sellerId: number;
      status: SellerKycStatus;
      reason?: string | null;
      reviewerId: number;
    },
    manager?: EntityManager
  ): Promise<SellerKycOverride> {
    const repository = manager ? manager.getRepository(SellerKycOverride) : this.repository;
    const existing = await this.findBySellerId(data.sellerId, manager);

    const payload = {
      status: data.status,
      reason: data.status === SellerKycStatus.REJECTED ? (data.reason ?? null) : null,
      reviewedBy: data.reviewerId,
      reviewedAt: new Date(),
    };

    if (existing) {
      await repository.update(existing.id, payload);
      return { ...existing, ...payload } as SellerKycOverride;
    }

    return await repository.save(repository.create({ sellerId: data.sellerId, ...payload }));
  }
}
