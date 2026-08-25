import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { KycVerificationEntity } from '../entities';

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
