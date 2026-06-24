import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { KycStatus, KycType } from "../../../default/common/enums/kyc.enum";
import { BaseRepository } from "src/default/common/repositories/base.repository";
import { KycVerificationEntity } from "src/modules/auth/entities";

@Injectable()
export class KycVerificationRepository extends BaseRepository<KycVerificationEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(KycVerificationEntity));
  }

  private getKycRepository(
    manager?: EntityManager,
  ): Repository<KycVerificationEntity> {
    return manager
      ? manager.getRepository(KycVerificationEntity)
      : this.repository;
  }

  async findByUserIdAndType(
    userId: string,
    type: KycType,
    manager?: EntityManager,
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        user_id: userId,
        type,
      },
    });
  }

  async findVerifiedByUserIdAndType(
    userId: string,
    type: KycType,
    manager?: EntityManager,
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        user_id: userId,
        type,
        status: KycStatus.VERIFIED,
      },
    });
  }

  async findByReferenceId(
    referenceId: string,
    manager?: EntityManager,
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        referenceId,
      },
    });
  }

  async findByDocumentNumberAndType(
    documentNumber: string,
    type: KycType,
    manager?: EntityManager,
  ): Promise<KycVerificationEntity | null> {
    return this.getKycRepository(manager).findOne({
      where: {
        documentNumber,
        type,
      },
    });
  }

  async upsertVerifiedKyc(
    data: {
      userId: string;
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
    manager?: EntityManager,
  ): Promise<KycVerificationEntity> {
    const repo = this.getKycRepository(manager);

    const existing = await repo.findOne({
      where: {
        user_id: data.userId,
        type: data.type,
      },
    });

    if (existing) {
      Object.assign(existing, {
        status: KycStatus.VERIFIED,
        referenceId: data.referenceId ?? existing.referenceId,
        documentNumber: data.documentNumber ?? existing.documentNumber,
        maskedDocumentNumber:
          data.maskedDocumentNumber ?? existing.maskedDocumentNumber,
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
      user_id: data.userId,
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

  async updateStatus(
    userId: string,
    type: KycType,
    status: KycStatus,
    failureReason?: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getKycRepository(manager).update(
      {
        user_id: userId,
        type,
      },
      {
        status,
        failureReason,
      },
    );
  }
}
