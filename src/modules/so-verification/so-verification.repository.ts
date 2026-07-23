import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { SoVerificationEvidence } from './entities/so-verification.entity';

@Injectable()
export class SoVerificationRepository {
  private repo: Repository<SoVerificationEvidence>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(SoVerificationEvidence);
  }

  async save(data: Partial<SoVerificationEvidence>): Promise<SoVerificationEvidence> {
    const entity = this.repo.create(data as SoVerificationEvidence);
    return await this.repo.save(entity);
  }

  async findByApprovalId(approvalId: number): Promise<SoVerificationEvidence[]> {
    return this.repo.find({
      where: { approval: { id: approvalId } as any },
      order: { createdAt: 'DESC' },
    });
  }

  // Latest active evidence for a retailer (for retailer-facing rejection display)
  async findLatestByRetailerId(retailerUserId: number): Promise<SoVerificationEvidence | null> {
    return this.repo.findOne({
      where: { retailerUser: { id: retailerUserId } as any },
      order: { createdAt: 'DESC' },
    });
  }
}