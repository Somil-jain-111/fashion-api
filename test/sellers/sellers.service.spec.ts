import { Test } from '@nestjs/testing';
import { SellersService } from 'src/modules/sellers/sellers.service';
import { UserRepository, RolesRepository } from 'src/modules/auth/repository';
import {
  SellerReviewRepository,
  SellerUpdateRequestRepository,
  StoreInformationRepository,
} from 'src/modules/sellers/repository';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { createMock } from '../utils/mock.util';
import { AppConfigService } from 'src/default/config/config.service';
import { SellerBusinessType, SellerOnboardingStatus } from 'src/modules/sellers/entities';
import { KycType } from 'src/default/common/enums/kyc.enum';
import { TransactionService } from 'src/default/databases/transaction';

describe('SellersService', () => {
  let service: SellersService;
  let userRepository: jest.Mocked<UserRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let storeInformationRepository: jest.Mocked<StoreInformationRepository>;
  let sellerReviewRepository: jest.Mocked<SellerReviewRepository>;
  let sellerUpdateRequestRepository: jest.Mocked<SellerUpdateRequestRepository>;
  let appConfigService: jest.Mocked<AppConfigService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: RolesRepository, useValue: createMock<RolesRepository>() },
        { provide: StoreInformationRepository, useValue: createMock<StoreInformationRepository>() },
        { provide: SellerReviewRepository, useValue: createMock<SellerReviewRepository>() },
        {
          provide: SellerUpdateRequestRepository,
          useValue: createMock<SellerUpdateRequestRepository>(),
        },
        { provide: AppConfigService, useValue: createMock<AppConfigService>() },
        { provide: TransactionService, useValue: createMock<TransactionService>() },
      ],
    }).compile();

    service = module.get(SellersService);
    userRepository = module.get(UserRepository);
    rolesRepository = module.get(RolesRepository);
    storeInformationRepository = module.get(StoreInformationRepository);
    sellerReviewRepository = module.get(SellerReviewRepository);
    sellerUpdateRequestRepository = module.get(SellerUpdateRequestRepository);
    appConfigService = module.get(AppConfigService);
    const transactionService = module.get(TransactionService) as jest.Mocked<TransactionService>;
    transactionService.execute.mockImplementation(async (callback: any) => callback({}));
    appConfigService.get.mockImplementation((key: string) =>
      key === 'KYC_ENCRYPTION_SECRET_KEY' ? 'a'.repeat(64) : 'b'.repeat(32)
    );
    storeInformationRepository.updateIncompleteProfile.mockResolvedValue(true);
    storeInformationRepository.transitionStatus.mockResolvedValue(true);
  });

  it('creates one pending update request for an approved seller', async () => {
    storeInformationRepository.findWorkflowBySellerId.mockResolvedValue({
      sellerId: 4,
      onboardingStatus: SellerOnboardingStatus.APPROVED,
    } as any);
    sellerUpdateRequestRepository.findPending.mockResolvedValue(null);
    sellerUpdateRequestRepository.create.mockResolvedValue({
      id: 9,
      sellerId: 4,
      section: 'PROFILE',
      reason: 'Address changed',
      status: 'PENDING',
    } as any);

    const result = await service.requestKycUpdate(4, 'PROFILE' as any, ' Address changed ');

    expect(sellerUpdateRequestRepository.create).toHaveBeenCalledWith(
      4,
      'PROFILE',
      'Address changed'
    );
    expect(result.id).toBe(9);
  });

  it('rejects an account that already holds the seller_admin role', async () => {
    userRepository.hasRole.mockResolvedValue(true);

    await expect(service.onboard(4, { storeName: 'My Store' })).rejects.toMatchObject({
      response: { errorCode: 'SEL_001' },
    });
    expect(storeInformationRepository.save).not.toHaveBeenCalled();
  });

  it('rejects when the seller_admin role does not exist in the DB', async () => {
    userRepository.hasRole.mockResolvedValue(false);
    rolesRepository.findByName.mockResolvedValue(null);

    await expect(service.onboard(4, { storeName: 'My Store' })).rejects.toMatchObject({
      response: { errorCode: 'ROL_001' },
    });
  });

  it('creates the store and grants the seller role on success, without touching existing roles', async () => {
    userRepository.hasRole.mockResolvedValue(false);
    rolesRepository.findByName.mockResolvedValue({ id: 3, name: UserRole.SELLER_ADMIN } as any);
    storeInformationRepository.save.mockResolvedValue({ storeName: 'My Store' } as any);
    userRepository.addRole.mockResolvedValue(undefined as any);

    const result = await service.onboard(4, { storeName: 'My Store' });

    expect(storeInformationRepository.save).toHaveBeenCalledWith({
      sellerId: 4,
      storeName: 'My Store',
    });
    expect(userRepository.addRole).toHaveBeenCalledWith(4, 3);
    expect(result).toEqual({ sellerId: '4', storeName: 'My Store' });
  });

  it('creates an individual business profile without requiring GSTIN', async () => {
    storeInformationRepository.findWorkflowBySellerId.mockResolvedValue({
      sellerId: 4,
      storeName: 'Initial',
      businessType: null,
    } as any);
    storeInformationRepository.updateIncompleteProfile.mockResolvedValue(true);

    const result = await service.createProfile(4, {
      businessName: 'Individual Store',
      businessType: SellerBusinessType.INDIVIDUAL,
      panNumber: 'ABCDE1234F',
      streetAddress: '12 Market Road',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      contactName: 'Seller Name',
      contactEmail: 'SELLER@example.com',
      contactPhone: '9876543210',
    });

    expect(result.nextStep).toBe(SellerOnboardingStatus.AGREEMENT_PENDING);
    expect(storeInformationRepository.updateIncompleteProfile).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ gstinNumber: null, contactEmail: 'seller@example.com' })
    );
  });

  it('moves to KYC only after accepting the current agreement version', async () => {
    storeInformationRepository.findWorkflowBySellerId.mockResolvedValue({
      sellerId: 4,
      businessType: SellerBusinessType.INDIVIDUAL,
      onboardingStatus: SellerOnboardingStatus.AGREEMENT_PENDING,
    } as any);
    storeInformationRepository.updateBySellerId.mockResolvedValue(true);

    await expect(
      service.acceptAgreement(
        4,
        { accepted: true, agreementVersion: '2026-01' },
        { ip: '127.0.0.1', headers: {} }
      )
    ).resolves.toMatchObject({ nextStep: SellerOnboardingStatus.KYC_PENDING });
  });

  it('requires only PAN and Aadhaar KYC for an individual before bank details', async () => {
    storeInformationRepository.findWorkflowBySellerId
      .mockResolvedValueOnce({
        sellerId: 4,
        businessType: SellerBusinessType.INDIVIDUAL,
        onboardingStatus: SellerOnboardingStatus.KYC_PENDING,
      } as any)
      .mockResolvedValueOnce({
        sellerId: 4,
        businessType: SellerBusinessType.INDIVIDUAL,
        onboardingStatus: SellerOnboardingStatus.KYC_PENDING,
      } as any)
      .mockResolvedValueOnce({
        sellerId: 4,
        businessType: SellerBusinessType.INDIVIDUAL,
        onboardingStatus: SellerOnboardingStatus.BANK_DETAILS_PENDING,
      } as any);
    storeInformationRepository.findVerifiedKycTypes.mockResolvedValue([
      KycType.PAN,
      KycType.AADHAAR,
    ]);
    storeInformationRepository.updateBySellerId.mockResolvedValue(true);

    await expect(
      service.saveBankDetails(4, {
        accountHolderName: 'Seller Name',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        branch: 'Delhi',
        bankState: 'Delhi',
        cancelledChequeUrl: 'https://cdn.example.com/cheque.jpg',
      })
    ).resolves.toMatchObject({ nextStep: SellerOnboardingStatus.ESIGN_PENDING });
  });

  it('returns a rejected profile with actionable correction requests', async () => {
    storeInformationRepository.findProfileSummaryBySellerId.mockResolvedValue({
      sellerId: 4,
      storeName: 'Store',
      businessType: SellerBusinessType.INDIVIDUAL,
      onboardingStatus: SellerOnboardingStatus.REJECTED,
    } as any);
    storeInformationRepository.findVerifiedKycTypes.mockResolvedValue([KycType.AADHAAR]);
    sellerReviewRepository.listOpen.mockResolvedValue([
      {
        section: 'PAN',
        remark: 'Upload a readable PAN image',
        reviewCycle: 2,
        createdAt: new Date('2026-08-30T00:00:00Z'),
      },
    ] as any);

    await expect(service.getProfile(4)).resolves.toMatchObject({
      onboardingStatus: SellerOnboardingStatus.REJECTED,
      correctionRequests: [
        { section: 'PAN', remark: 'Upload a readable PAN image', reviewCycle: '2' },
      ],
    });
  });
});
