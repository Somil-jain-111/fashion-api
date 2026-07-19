import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import { BankAccount } from '../entities/bank-account.entity';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class BankAccountRepository extends BaseRepository<BankAccount> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(BankAccount));
  }

  async findBankAccountByUserId(
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<BankAccount | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BankAccount) : this.repository;

    return await repo.findOne({
      where: { user: { id: userId }, status: 1 },
    });
  }
}
