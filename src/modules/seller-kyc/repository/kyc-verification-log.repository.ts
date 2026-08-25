import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { KycLogStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { KycVerificationLogEntity } from '../entities';

@Injectable()
export class KycVerificationLogRepository extends BaseRepository<KycVerificationLogEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(KycVerificationLogEntity));
  }

  private getKycLogRepository(manager?: EntityManager): Repository<KycVerificationLogEntity> {
    return manager ? manager.getRepository(KycVerificationLogEntity) : this.repository;
  }

  async createLog(
    data: {
      user_id: number;
      type: KycType;
      status: KycLogStatus;
      referenceId?: string;
      documentNumber?: string;
      provider?: string;
      requestPayload?: Record<string, any>;
      responsePayload?: Record<string, any>;
      failureReason?: string;
      journeyId?: string;
    },
    manager?: EntityManager
  ): Promise<KycVerificationLogEntity> {
    const repo = this.getKycLogRepository(manager);

    const entity = repo.create({
      user: { id: data.user_id } as any,
      type: data.type,
      status: data.status,
      referenceId: data.referenceId,
      documentNumber: data.documentNumber,
      provider: data.provider,
      requestPayload: data.requestPayload,
      responsePayload: data.responsePayload,
      failureReason: data.failureReason,
      journeyId: data.journeyId,
    });

    return repo.save(entity);
  }

  async expireAllPendingOtpLogs(
    userId: number,
    type: KycType,
    manager?: EntityManager
  ): Promise<void> {
    const repo = this.getKycLogRepository(manager);

    await repo.update(
      {
        user: { id: userId },
        type,
        status: KycLogStatus.OTP_SENT,
      },
      {
        status: KycLogStatus.EXPIRED,
        failureReason: 'OTP expired due to new OTP request',
      }
    );
  }

  async findLatestValidOtpLog(
    userId: number,
    type: KycType,
    referenceId: string,
    expiryMinutes = 10,
    manager?: EntityManager
  ): Promise<KycVerificationLogEntity | null> {
    const repo = this.getKycLogRepository(manager);

    const expiryDate = new Date(Date.now() - expiryMinutes * 60 * 1000);

    return repo
      .createQueryBuilder('log')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.type = :type', { type })
      .andWhere('log.referenceId = :referenceId', { referenceId })
      .andWhere('log.status = :status', { status: KycLogStatus.OTP_SENT })
      .andWhere('log.created_at > :expiryDate', { expiryDate })
      .orderBy('log.created_at', 'DESC')
      .getOne();
  }
}
