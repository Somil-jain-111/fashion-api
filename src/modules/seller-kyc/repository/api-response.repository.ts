import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ApiResponseEntity } from '../entities';

@Injectable()
export class ApiResponseRepository extends BaseRepository<ApiResponseEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(ApiResponseEntity));
  }

  async saveResponse(
    data: {
      type: string;
      transactionId?: string;
      requestUrl: string;
      requestPayload: Record<string, any>;
      responsePayload?: Record<string, any>;
    },
    manager?: EntityManager
  ): Promise<ApiResponseEntity> {
    const repo = manager ? manager.getRepository(ApiResponseEntity) : this.repository;
    const entity = repo.create({
      type: data.type,
      transactionId: data.transactionId,
      requestUrl: this.withoutQueryString(data.requestUrl),
      requestPayload: this.auditSummary(data.requestPayload),
      responsePayload: data.responsePayload ? this.auditSummary(data.responsePayload) : undefined,
      active: true,
    });
    return repo.save(entity);
  }

  async updateResponseByTransactionId(
    transactionId: string,
    responsePayload: Record<string, any>,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    if (!transactionId) {
      return false;
    }

    const repo = this.getRepository(queryRunner);
    const result = await repo.update(
      { transactionId },
      { responsePayload: this.auditSummary(responsePayload) }
    );

    return Number(result.affected) > 0;
  }

  /**
   * Provider payloads contain identity documents, OTPs and authorization headers.
   * The audit table records outcome metadata only; full KYC evidence is encrypted in
   * kyc_verifications and must never be duplicated into a general-purpose log table.
   */
  private auditSummary(value: Record<string, any>): Record<string, any> {
    const source = value?.data && typeof value.data === 'object' ? value.data : value;
    const summary: Record<string, any> = {};
    const safeKeys = [
      'type',
      'status',
      'success',
      'message',
      'code',
      'statusCode',
      'statuscode',
      'transaction_id',
      'transactionId',
      'reference_id',
      'referenceId',
    ];

    for (const key of safeKeys) {
      const candidate = value?.[key] ?? source?.[key];
      if (['string', 'number', 'boolean'].includes(typeof candidate)) summary[key] = candidate;
    }

    return summary;
  }

  private withoutQueryString(url: string): string {
    return String(url || '').split('?')[0];
  }
}
