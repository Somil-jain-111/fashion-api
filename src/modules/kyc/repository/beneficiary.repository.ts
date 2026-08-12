import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { UserBeneficiary } from '../entities/beneficiary.entity';
import { BeneficiaryType, BeneficiaryStatus } from 'src/default/common/enums/user-beneficiary.enum';

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
      relationship?: string | null;
      beneficiary_name?: string | null;
      mobileNumber?: string | null;
      panNumber?: string | null;
      aadhaarNumber?: string | null;
      address?: string | null;
      status: BeneficiaryStatus;
      referenceId?: string | null;
      metadata?: Record<string, any> | null;
    },
    queryRunner?: QueryRunner
  ): Promise<UserBeneficiary> {
    return await this.save(
      {
        user: { id: data.userId } as any,
        type: data.type,
        accountNumber: data.accountNumber,
        ifsc: data.ifsc,
        bankName: data.bankName,
        bankHolderName: data.bankHolderName,
        upi: data.upi,
        relationship: data.relationship,
        beneficiary_name: data.beneficiary_name,
        mobileNumber: data.mobileNumber,
        panNumber: data.panNumber,
        aadhaarNumber: data.aadhaarNumber,
        address: data.address,
        status: data.status,
        referenceId: data.referenceId,
        metadata: data.metadata,
      },
      queryRunner
    );
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
        createdAt: 'ASC',
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

  /**
   * Looks up an active bank beneficiary by account number + IFSC across ALL users
   * (not just the requesting user), mirroring how PAN/Aadhaar duplicate checks work
   * in KycService. Returns the owning record (with `user` loaded) so callers can
   * distinguish "already used by me" vs "already used by another account".
   */
  async isAccountInfoExist(
    accountNumberENC: string,
    ifscENC: string,
    queryRunner?: QueryRunner
  ): Promise<UserBeneficiary | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        type: BeneficiaryType.BANK,
        accountNumber: accountNumberENC,
        ifsc: ifscENC,
        active: true,
        status: 1,
      } as any,
      relations: { user: true } as any,
    });
  }

  /**
   * Looks up an active UPI beneficiary across ALL users (not just the requesting
   * user) — see isAccountInfoExist for rationale.
   */
  async isUpiExist(upiENC: string, queryRunner?: QueryRunner): Promise<UserBeneficiary | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        type: BeneficiaryType.UPI,
        upi: upiENC,
        active: true,
        status: 1,
      } as any,
      relations: { user: true } as any,
    });
  }
}
