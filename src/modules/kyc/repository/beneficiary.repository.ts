import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { UserBeneficiary } from '../entities/beneficiary.entity';
import { KycVerificationEntity } from '../entities/kyc-verification.entity';
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
      otp?: string | null;
      otp_expiry?: Date | null;
      otp_attempt_count?: number;
      otherRelationship?: string;
      panVerification?: KycVerificationEntity | null;
      aadhaarVerification?: KycVerificationEntity | null;
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
        otp: data.otp,
        otp_expiry: data.otp_expiry,
        otp_attempt_count: data.otp_attempt_count ?? 0,
        otherRelationship: data.otherRelationship || null,
        panVerification: data.panVerification ?? null,
        aadhaarVerification: data.aadhaarVerification ?? null,
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
      relations: ['panVerification', 'aadhaarVerification'],
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
   * (not just the requesting user).
   * Returns the owning record.
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
        // status: BeneficiaryStatus.VERIFIED,
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
        // status: BeneficiaryStatus.VERIFIED,
      } as any,
      relations: { user: true } as any,
    });
  }

  async findActiveBeneficiaryWithVerifications(
    beneId: number,
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<UserBeneficiary | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        id: beneId,
        user: { id: userId },
        active: true,
      },
      relations: ['panVerification', 'aadhaarVerification'],
    });
  }

  async softDeleteBeneficiary(
    beneId: number,
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const result = await this.getRepository(queryRunner).update(
      {
        id: beneId,
        user: { id: userId },
        active: true,
      },
      {
        active: false,
      }
    );
    return Number(result.affected) > 0;
  }
}
