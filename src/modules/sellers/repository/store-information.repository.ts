import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { SellerBusinessType, SellerOnboardingStatus, StoreInformation } from '../entities';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { KycVerificationEntity } from 'src/modules/seller-kyc/entities';

export type SellerWorkflowSnapshot = Pick<
  StoreInformation,
  'sellerId' | 'businessType' | 'onboardingStatus'
> & {
  bankDetailsCompleted?: boolean;
};

export type SellerProfileSummary = Pick<
  StoreInformation,
  | 'sellerId'
  | 'storeName'
  | 'businessType'
  | 'streetAddress'
  | 'city'
  | 'state'
  | 'pincode'
  | 'contactName'
  | 'contactEmail'
  | 'contactPhone'
  | 'agreementAcceptedAt'
  | 'signedAt'
  | 'onboardingStatus'
> & {
  hasGstin: boolean;
  bankDetailsCompleted: boolean;
};

@Injectable()
export class StoreInformationRepository extends BaseRepository<StoreInformation> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(StoreInformation));
  }

  async findBySellerId(sellerId: number): Promise<StoreInformation | null> {
    return await this.repository.findOne({ where: { sellerId } as any });
  }

  async findVerificationDashboardBySellerId(sellerId: number): Promise<StoreInformation | null> {
    return this.repository.findOne({
      where: { sellerId } as any,
      select: {
        sellerId: true,
        storeName: true,
        businessType: true,
        streetAddress: true,
        city: true,
        state: true,
        pincode: true,
        bankAccountNumber: true,
        bankName: true,
        agreementVersion: true,
        agreementAcceptedAt: true,
        signedAt: true,
        onboardingStatus: true,
      } as any,
    });
  }

  async findWorkflowBySellerId(
    sellerId: number,
    manager?: EntityManager,
    lockForUpdate = false
  ): Promise<SellerWorkflowSnapshot | null> {
    const repository = manager ? manager.getRepository(StoreInformation) : this.repository;
    const query = repository
      .createQueryBuilder('store')
      .select('store.sellerId', 'sellerId')
      .addSelect('store.businessType', 'businessType')
      .addSelect('store.onboardingStatus', 'onboardingStatus')
      .addSelect(
        'CASE WHEN store.bankAccountNumber IS NOT NULL AND store.cancelledChequeUrl IS NOT NULL THEN 1 ELSE 0 END',
        'bankDetailsCompleted'
      )
      .where('store.sellerId = :sellerId', { sellerId });

    if (lockForUpdate) query.setLock('pessimistic_write');

    const row = await query.getRawOne<{
      sellerId: string;
      businessType: SellerBusinessType | null;
      onboardingStatus: SellerOnboardingStatus;
      bankDetailsCompleted: string | number;
    }>();

    return row
      ? {
          sellerId: Number(row.sellerId),
          businessType: row.businessType ?? undefined,
          onboardingStatus: row.onboardingStatus,
          bankDetailsCompleted: Boolean(Number(row.bankDetailsCompleted)),
        }
      : null;
  }

  async findProfileSummaryBySellerId(sellerId: number): Promise<SellerProfileSummary | null> {
    const row = await this.repository
      .createQueryBuilder('store')
      .select('store.sellerId', 'sellerId')
      .addSelect('store.storeName', 'storeName')
      .addSelect('store.businessType', 'businessType')
      .addSelect('store.streetAddress', 'streetAddress')
      .addSelect('store.city', 'city')
      .addSelect('store.state', 'state')
      .addSelect('store.pincode', 'pincode')
      .addSelect('store.contactName', 'contactName')
      .addSelect('store.contactEmail', 'contactEmail')
      .addSelect('store.contactPhone', 'contactPhone')
      .addSelect('store.agreementAcceptedAt', 'agreementAcceptedAt')
      .addSelect('store.signedAt', 'signedAt')
      .addSelect('store.onboardingStatus', 'onboardingStatus')
      .addSelect('CASE WHEN store.gstinNumber IS NOT NULL THEN 1 ELSE 0 END', 'hasGstin')
      .addSelect(
        'CASE WHEN store.bankAccountNumber IS NOT NULL AND store.cancelledChequeUrl IS NOT NULL THEN 1 ELSE 0 END',
        'bankDetailsCompleted'
      )
      .where('store.sellerId = :sellerId', { sellerId })
      .getRawOne<any>();

    return row
      ? {
          ...row,
          sellerId: Number(row.sellerId),
          hasGstin: Boolean(Number(row.hasGstin)),
          bankDetailsCompleted: Boolean(Number(row.bankDetailsCompleted)),
        }
      : null;
  }

  async updateBySellerId(
    sellerId: number,
    data: Partial<StoreInformation>,
    manager?: EntityManager
  ): Promise<boolean> {
    const repository = manager ? manager.getRepository(StoreInformation) : this.repository;
    const result = await repository.update({ sellerId } as any, data);
    return Number(result.affected) > 0;
  }

  async updateIncompleteProfile(
    sellerId: number,
    data: Partial<StoreInformation>
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(StoreInformation)
      .set(data)
      .where('seller_id = :sellerId', { sellerId })
      .andWhere('business_type IS NULL')
      .execute();
    return Number(result.affected) > 0;
  }

  async transitionStatus(
    sellerId: number,
    expected: SellerOnboardingStatus,
    next: SellerOnboardingStatus,
    data: Partial<StoreInformation> = {}
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(StoreInformation)
      .set({ ...data, onboardingStatus: next })
      .where('seller_id = :sellerId', { sellerId })
      .andWhere('onboarding_status = :expected', { expected })
      .execute();
    return Number(result.affected) > 0;
  }

  async findVerifiedKycTypes(sellerId: number): Promise<KycType[]> {
    const rows = await this.repository.manager
      .getRepository(KycVerificationEntity)
      .createQueryBuilder('kyc')
      .select('kyc.type', 'type')
      .where('kyc.user_id = :sellerId', { sellerId })
      .andWhere('kyc.status = :status', { status: KycStatus.VERIFIED })
      .andWhere('kyc.deleted_at IS NULL')
      .getRawMany<{ type: KycType }>();

    return rows.map((row) => row.type);
  }
}
