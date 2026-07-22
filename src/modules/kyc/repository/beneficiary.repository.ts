import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { BeneficiaryType } from 'src/default/common/enums/kyc.enum';
import { UserBeneficiary } from '../entities/beneficiary.entity';

@Injectable()
export class BeneficiaryRepository extends BaseRepository<UserBeneficiary> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(UserBeneficiary));
  }

  async createBeneficiary(
    data: {
      userId: number;
      type: BeneficiaryType;
      accountNumber?: string | null;
      ifsc?: string | null;
      bankName?: string | null;
      bankHolderName?: string | null;
      upi?: string | null;
      status?: number;
      referenceId?: string | null;
      metadata?: Record<string, any> | null;
    },
    queryRunner?: QueryRunner
  ): Promise<UserBeneficiary> {
    const repo = this.getRepository(queryRunner);

    const beneficiary = repo.create({
      user: { id: data.userId } as any,
      type: data.type,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc,
      bankName: data.bankName,
      bankHolderName: data.bankHolderName,
      upi: data.upi,
      status: data.status ?? 1,
      referenceId: data.referenceId,
      metadata: data.metadata,
    });

    return await repo.save(beneficiary);
  }

  async findUserBeneficiaries(
    userId: number,
    beneId?: number,
    queryRunner?: QueryRunner
  ): Promise<UserBeneficiary[]> {
    const where: any = {
      user: { id: userId },
      active: true,
    };

    if (beneId) {
      where.id = beneId;
    }

    return await this.getRepository(queryRunner).find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findBankAccountByBeneId(
    userId: number,
    beneId: number,
    queryRunner?: QueryRunner
  ): Promise<UserBeneficiary> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        id: beneId,
        user: { id: userId },
        active: true,
      },
    });
  }

  async isAccountInfoExist(
    accountNumberENC: string,
    ifscENC: string,
    userId?: number,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const whereCondition: any = {
      type: BeneficiaryType.BANK,
      accountNumber: accountNumberENC,
      ifsc: ifscENC,
      active: true,
      status: 1,
    };

    if (userId) {
      whereCondition.user = { id: userId };
    }

    const existing = await this.getRepository(queryRunner).findOne({
      where: whereCondition,
    });

    return Boolean(existing);
  }

  async isUpiExist(upiENC: string, userId?: number, queryRunner?: QueryRunner): Promise<boolean> {
    const whereCondition: any = {
      type: BeneficiaryType.UPI,
      upi: upiENC,
      active: true,
      status: 1,
    };

    if (userId) {
      whereCondition.user = { id: userId };
    }

    const existing = await this.getRepository(queryRunner).findOne({
      where: whereCondition,
    });

    return Boolean(existing);
  }
}
