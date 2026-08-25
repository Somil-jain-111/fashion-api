import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { SellerKycStatus } from 'src/default/common/enums/kyc.enum';
import { SellerKycOverride } from '../entities';

@Injectable()
export class SellerKycOverrideRepository extends BaseRepository<SellerKycOverride> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(SellerKycOverride));
  }

  async findBySellerId(sellerId: number): Promise<SellerKycOverride | null> {
    return await this.repository.findOne({ where: { sellerId } as any });
  }

  async upsert(data: {
    sellerId: number;
    status: SellerKycStatus;
    reason?: string | null;
    reviewerId: number;
  }): Promise<SellerKycOverride> {
    const existing = await this.findBySellerId(data.sellerId);

    const payload = {
      status: data.status,
      reason: data.status === SellerKycStatus.REJECTED ? (data.reason ?? null) : null,
      reviewedBy: data.reviewerId,
      reviewedAt: new Date(),
    };

    if (existing) {
      await this.updateById(existing.id, payload);
      return { ...existing, ...payload } as SellerKycOverride;
    }

    return await this.save({ sellerId: data.sellerId, ...payload });
  }
}
