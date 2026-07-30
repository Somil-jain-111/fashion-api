// src/modules/kyc/repository/kyc-verification-log.repository.ts

import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { KycLogStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { KycVerificationLogEntity } from 'src/modules/auth/entities';

@Injectable()
export class KycVerificationLogRepository extends BaseRepository<KycVerificationLogEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(KycVerificationLogEntity));
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
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity> {
    return await this.save(
      {
        user: { id: data.user_id },
        type: data.type,
        status: data.status,
        referenceId: data.referenceId,
        documentNumber: data.documentNumber,
        provider: data.provider,
        requestPayload: data.requestPayload,
        responsePayload: data.responsePayload,
        failureReason: data.failureReason,
        journeyId: data.journeyId,
      },
      queryRunner
    );
  }

  async findByReferenceId(
    referenceId: string,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        referenceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findLatestByUserIdAndType(
    userId: number,
    type: KycType,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        user: { id: userId },
        type,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findLogsByUserId(
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity[]> {
    return this.getRepository(queryRunner).find({
      where: {
        user: { id: userId },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findLogsByUserIdAndType(
    userId: number,
    type: KycType,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity[]> {
    return this.getRepository(queryRunner).find({
      where: {
        user: { id: userId },
        type,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findLatestOtpSentLog(
    userId: number,
    type: KycType,
    referenceId: string,
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity | null> {
    return this.getRepository(queryRunner).findOne({
      where: {
        user: { id: userId },
        type,
        referenceId,
        status: KycLogStatus.OTP_SENT,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
  async expireOldOtpLogs(
    userId: string,
    type: KycType,
    expiryMinutes = 10,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const expiryDate = new Date(Date.now() - expiryMinutes * 60 * 1000);

    await this.getRepository(queryRunner)
      .createQueryBuilder()
      .update(KycVerificationLogEntity)
      .set({
        status: KycLogStatus.EXPIRED,
        failureReason: 'OTP expired due to new OTP request',
      })
      .where('user_id = :userId', { userId })
      .andWhere('type = :type', { type })
      .andWhere('status = :status', { status: KycLogStatus.OTP_SENT })
      .andWhere('created_at <= :expiryDate', { expiryDate })
      .execute();
  }

  async expireAllPendingOtpLogs(
    userId: number,
    type: KycType,
    queryRunner?: QueryRunner
  ): Promise<void> {
    await this.getRepository(queryRunner).update(
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
    queryRunner?: QueryRunner
  ): Promise<KycVerificationLogEntity | null> {
    const expiryDate = new Date(Date.now() - expiryMinutes * 60 * 1000);

    return this.getRepository(queryRunner)
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
