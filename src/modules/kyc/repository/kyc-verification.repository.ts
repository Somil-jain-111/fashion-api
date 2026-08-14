import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { KycVerificationEntity } from 'src/modules/auth/entities';

@Injectable()
export class KycVerificationRepository extends BaseRepository<KycVerificationEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(KycVerificationEntity));
  }

  async findByUserIdAndType(
    userId: string,
    type: KycType,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        user: { id: Number(userId) },
        type,
        active: true,
      },
    });
  }

  async findVerifiedByUserIdAndType(
    userId: number,
    type: KycType,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        user: { id: Number(userId) },
        type,
        status: KycStatus.VERIFIED,
        active: true,
      },
    });
  }

  async findByReferenceId(
    referenceId: string,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        referenceId,
        active: true,
      },
    });
  }

  async findByDocumentNumberAndType(
    documentNumber: string,
    type: KycType,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        documentNumber,
        type,
        active: true,
      },
      relations: ['user'],
    });
  }

  async upsertVerifiedKyc(
    data: {
      userId: number;
      type: KycType;
      status?: KycStatus;
      referenceId?: string;
      documentNumber?: string;
      maskedDocumentNumber?: string;
      verifiedName?: string;
      provider?: string;
      active?: boolean;
      providerRequest?: Record<string, any>;
      providerResponse?: Record<string, any>;
      metadata?: Record<string, any>;
    },
    queryRunner?: QueryRunner
  ): Promise<KycVerificationEntity> {
    const repo = this.getRepository(queryRunner);
    const status = data.status ?? KycStatus.VERIFIED;

    const existing = await repo.findOne({
      where: {
        user: { id: data.userId },
        type: data.type,
      },
    });

    if (existing) {
      Object.assign(existing, {
        status,
        referenceId: data.referenceId ?? existing.referenceId,
        documentNumber: data.documentNumber ?? existing.documentNumber,
        maskedDocumentNumber: data.maskedDocumentNumber ?? existing.maskedDocumentNumber,
        verifiedName: data.verifiedName ?? existing.verifiedName,
        provider: data.provider ?? existing.provider,
        providerRequest: data.providerRequest ?? existing.providerRequest,
        providerResponse: data.providerResponse ?? existing.providerResponse,
        metadata: data.metadata ?? existing.metadata,
        failureReason: null,
        active: typeof data.active === 'boolean' ? data.active : true,
      });

      return repo.save(existing);
    }

    return await this.save(
      {
        user: { id: data.userId },
        type: data.type,
        status,
        referenceId: data.referenceId,
        documentNumber: data.documentNumber,
        maskedDocumentNumber: data.maskedDocumentNumber,
        verifiedName: data.verifiedName,
        provider: data.provider,
        providerRequest: data.providerRequest,
        providerResponse: data.providerResponse,
        metadata: data.metadata,
        failureReason: null,
        active: typeof data.active === 'boolean' ? data.active : true,
      },
      queryRunner
    );
  }

  async updateStatus(
    userId: number,
    type: KycType,
    status: KycStatus,
    failureReason?: string,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const result = await this.getRepository(queryRunner).update(
      {
        user: { id: userId },
        type,
        active: true,
      },
      {
        status,
        failureReason,
      }
    );

    return Number(result.affected) > 0;
  }

  async softDeleteKycVerification(id: number, queryRunner?: QueryRunner): Promise<boolean> {
    const result = await this.getRepository(queryRunner).update({ id }, { active: false });
    return Number(result.affected) > 0;
  }
}
