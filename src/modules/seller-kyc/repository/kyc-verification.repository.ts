import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { KycStatus, KycType, SellerKycOverallStatus } from 'src/default/common/enums/kyc.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { KycVerificationEntity } from '../entities';

export type AdminKycListItem = {
  sellerId: number;
  name: string | null;
  email: string | null;
  businessName: string | null;
  verifiedCount: number;
  status: SellerKycOverallStatus;
  override: { status: string; reason: string | null; reviewedAt: Date } | null;
};

@Injectable()
export class KycVerificationRepository extends BaseRepository<KycVerificationEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(KycVerificationEntity));
  }

  private getKycRepository(manager?: EntityManager): Repository<KycVerificationEntity> {
    return manager ? manager.getRepository(KycVerificationEntity) : this.repository;
  }

  async findByUserIdAndType(
    userId: string,
    type: KycType,
    manager?: EntityManager
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        user: { id: Number(userId) },
        type,
      },
    });
  }

  async findVerifiedByUserIdAndType(
    userId: number,
    type: KycType,
    manager?: EntityManager
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        user: { id: Number(userId) },
        type,
        status: KycStatus.VERIFIED,
      },
    });
  }

  async findByDocumentNumberAndType(
    documentNumber: string,
    type: KycType,
    manager?: EntityManager
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        documentNumber,
        type,
      },
      relations: ['user'],
    });
  }

  async findAllByUserId(userId: number, manager?: EntityManager): Promise<KycVerificationEntity[]> {
    return this.getKycRepository(manager).find({
      where: {
        user: { id: userId },
      },
    });
  }

  /**
   * One flat query for the admin seller list — how many of {PAN, GST, AADHAAR}
   * each user has VERIFIED, avoiding an N+1 per seller.
   */
  async countVerifiedTypesByUser(): Promise<Map<number, number>> {
    const rows = await this.repository
      .createQueryBuilder('kv')
      .select('kv.user_id', 'userId')
      .addSelect('COUNT(DISTINCT kv.type)', 'count')
      .where('kv.status = :status', { status: KycStatus.VERIFIED })
      .andWhere('kv.type IN (:...types)', { types: [KycType.PAN, KycType.GST, KycType.AADHAAR] })
      .groupBy('kv.user_id')
      .getRawMany<{ userId: string; count: string }>();

    return new Map(rows.map((r) => [Number(r.userId), Number(r.count)]));
  }

  /**
   * The Super Admin KYC list, filtered by derived overall status at the DB
   * level (not fetched-then-filtered-in-memory) — the status itself is a CASE
   * expression over a per-seller verified-type count and an optional override
   * row, wrapped as a derived table so the filter and pagination both run in
   * SQL. Completing all three KYC types alone lands a seller in
   * USER_PROFILE_APPROVAL, not APPROVED — only an explicit override does that
   * (see SellerKycService.review).
   */
  async findSellersByDerivedStatus(
    status: SellerKycOverallStatus | undefined,
    page: number,
    limit: number
  ): Promise<{ items: AdminKycListItem[]; total: number }> {
    const buildDerived = (qb: SelectQueryBuilder<any>) =>
      qb
        .select('u.id', 'sellerId')
        .addSelect('u.username', 'name')
        .addSelect('u.email', 'email')
        .addSelect('u.firm_name', 'businessName')
        .addSelect('COALESCE(vc.verifiedCount, 0)', 'verifiedCount')
        .addSelect('ov.status', 'overrideStatus')
        .addSelect('ov.reason', 'overrideReason')
        .addSelect('ov.reviewed_at', 'overrideReviewedAt')
        .addSelect(
          `CASE
             WHEN ov.status = 'APPROVED' THEN 'APPROVED'
             WHEN ov.status = 'REJECTED' THEN 'REJECTED'
             WHEN COALESCE(vc.verifiedCount, 0) = 3 THEN 'USER_PROFILE_APPROVAL'
             WHEN COALESCE(vc.verifiedCount, 0) = 0 THEN 'NOT_STARTED'
             ELSE 'PENDING'
           END`,
          'derivedStatus'
        )
        .from('users', 'u')
        .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
        .innerJoin(
          'roles',
          'r',
          'r.id = ur.role_id AND r.name = :roleName AND r.deleted_at IS NULL',
          { roleName: UserRole.SELLER_ADMIN }
        )
        .leftJoin(
          (sub) =>
            sub
              .select('kv.user_id', 'userId')
              .addSelect('COUNT(DISTINCT kv.type)', 'verifiedCount')
              .from('kyc_verifications', 'kv')
              .where('kv.status = :verifiedStatus', { verifiedStatus: KycStatus.VERIFIED })
              .andWhere('kv.type IN (:...kycTypes)', {
                kycTypes: [KycType.PAN, KycType.GST, KycType.AADHAAR],
              })
              .andWhere('kv.deleted_at IS NULL')
              .groupBy('kv.user_id'),
          'vc',
          'vc.userId = u.id'
        )
        .leftJoin('seller_kyc_overrides', 'ov', 'ov.seller_id = u.id AND ov.deleted_at IS NULL')
        .where('u.deleted_at IS NULL');

    // No status → no filter at all (every seller, any status), not "match nothing".
    const applyStatusFilter = (qb: SelectQueryBuilder<any>) =>
      status ? qb.where('derived.derivedStatus = :status', { status }) : qb;

    const [rows, totalRow] = await Promise.all([
      applyStatusFilter(
        this.repository.manager
          .createQueryBuilder()
          .select('derived.*')
          .from((sub) => buildDerived(sub), 'derived')
      )
        .orderBy('derived.sellerId', 'ASC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<{
          sellerId: string;
          name: string | null;
          email: string | null;
          businessName: string | null;
          verifiedCount: string;
          overrideStatus: string | null;
          overrideReason: string | null;
          overrideReviewedAt: Date | null;
          derivedStatus: SellerKycOverallStatus;
        }>(),
      applyStatusFilter(
        this.repository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'total')
          .from((sub) => buildDerived(sub), 'derived')
      ).getRawOne<{ total: string }>(),
    ]);

    return {
      items: rows.map((r) => ({
        sellerId: Number(r.sellerId),
        name: r.name ?? null,
        email: r.email ?? null,
        businessName: r.businessName ?? null,
        verifiedCount: Number(r.verifiedCount),
        status: r.derivedStatus,
        override: r.overrideStatus
          ? {
              status: r.overrideStatus,
              reason: r.overrideReason ?? null,
              reviewedAt: r.overrideReviewedAt as Date,
            }
          : null,
      })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async upsertVerifiedKyc(
    data: {
      userId: number;
      type: KycType;
      referenceId?: string;
      documentNumber?: string;
      maskedDocumentNumber?: string;
      verifiedName?: string;
      provider?: string;
      providerRequest?: Record<string, any>;
      providerResponse?: Record<string, any>;
      metadata?: Record<string, any>;
    },
    manager?: EntityManager
  ): Promise<KycVerificationEntity> {
    const repo = this.getKycRepository(manager);

    const existing = await repo.findOne({
      where: {
        user: { id: data.userId },
        type: data.type,
      },
    });

    if (existing) {
      Object.assign(existing, {
        status: KycStatus.VERIFIED,
        referenceId: data.referenceId ?? existing.referenceId,
        documentNumber: data.documentNumber ?? existing.documentNumber,
        maskedDocumentNumber: data.maskedDocumentNumber ?? existing.maskedDocumentNumber,
        verifiedName: data.verifiedName ?? existing.verifiedName,
        provider: data.provider ?? existing.provider,
        providerRequest: data.providerRequest ?? existing.providerRequest,
        providerResponse: data.providerResponse ?? existing.providerResponse,
        metadata: data.metadata ?? existing.metadata,
        failureReason: null,
      });

      return repo.save(existing);
    }

    const entity = repo.create({
      user: { id: data.userId } as any,
      type: data.type,
      status: KycStatus.VERIFIED,
      referenceId: data.referenceId,
      documentNumber: data.documentNumber,
      maskedDocumentNumber: data.maskedDocumentNumber,
      verifiedName: data.verifiedName,
      provider: data.provider,
      providerRequest: data.providerRequest,
      providerResponse: data.providerResponse,
      metadata: data.metadata,
      failureReason: null,
    });

    return repo.save(entity);
  }
}
