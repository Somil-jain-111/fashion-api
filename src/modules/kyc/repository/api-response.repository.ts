import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ApiResponseEntity } from '../entities/api-response.entity';

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
      requestUrl: data.requestUrl,
      requestPayload: data.requestPayload,
      responsePayload: data.responsePayload,
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
    const result = await repo.update({ transactionId }, { responsePayload });

    return Number(result.affected) > 0;
  }
}
