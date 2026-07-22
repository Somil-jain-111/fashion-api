import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import { Payout } from '../entities/payout.entity';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class PayoutRepository extends BaseRepository<Payout> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Payout));
  }

  async findLatestByTransactionId(
    transactionId: string,
    userId: number,
    relations: string[] = [],
    queryRunner?: QueryRunner
  ): Promise<Payout | null> {
    const repo = this.getRepository(queryRunner);

    return await repo.findOne({
      where: { transaction_id: transactionId, user: { id: userId } },
      relations,
    });
  }
}
