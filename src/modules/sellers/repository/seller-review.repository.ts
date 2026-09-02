import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  SellerOnboardingAudit,
  SellerReviewIssue,
  SellerReviewIssueStatus,
  SellerReviewSection,
} from '../entities';

@Injectable()
export class SellerReviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  private issueRepo(manager?: EntityManager) {
    return (manager || this.dataSource.manager).getRepository(SellerReviewIssue);
  }

  async createIssues(
    sellerId: number,
    reviewerId: number,
    issues: Array<{ section: SellerReviewSection; remark: string }>,
    manager: EntityManager
  ): Promise<void> {
    const repo = this.issueRepo(manager);
    await repo.update(
      { sellerId, status: SellerReviewIssueStatus.OPEN },
      { status: SellerReviewIssueStatus.RESOLVED, resolvedAt: new Date() }
    );
    const latest = await repo.maximum('reviewCycle', { sellerId });
    const reviewCycle = Number(latest || 0) + 1;
    await repo.save(
      issues.map((issue) =>
        repo.create({ ...issue, sellerId, reviewedBy: reviewerId, reviewCycle })
      )
    );
  }

  listOpen(sellerId: number, manager?: EntityManager): Promise<SellerReviewIssue[]> {
    return this.issueRepo(manager).find({
      where: { sellerId, status: SellerReviewIssueStatus.OPEN },
      select: { id: true, section: true, remark: true, reviewCycle: true, createdAt: true },
      order: { id: 'ASC' },
    });
  }

  async isOpen(sellerId: number, section: SellerReviewSection): Promise<boolean> {
    return this.issueRepo().exist({
      where: { sellerId, section, status: SellerReviewIssueStatus.OPEN },
    });
  }

  async resolve(sellerId: number, section: SellerReviewSection, manager: EntityManager) {
    await this.issueRepo(manager).update(
      { sellerId, section, status: SellerReviewIssueStatus.OPEN },
      { status: SellerReviewIssueStatus.RESOLVED, resolvedAt: new Date() }
    );
  }

  async countOpen(sellerId: number, manager: EntityManager): Promise<number> {
    return this.issueRepo(manager).count({
      where: { sellerId, status: SellerReviewIssueStatus.OPEN },
    });
  }

  async audit(data: Partial<SellerOnboardingAudit>, manager: EntityManager): Promise<void> {
    const repo = manager.getRepository(SellerOnboardingAudit);
    await repo.save(repo.create(data));
  }

  listAudit(sellerId: number): Promise<SellerOnboardingAudit[]> {
    return this.dataSource.getRepository(SellerOnboardingAudit).find({
      where: { sellerId },
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        section: true,
        fromStatus: true,
        toStatus: true,
        metadata: true,
        createdAt: true,
      },
      order: { id: 'DESC' },
      take: 200,
    });
  }
}
