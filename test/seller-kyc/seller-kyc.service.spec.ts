import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SellerKycService } from 'src/modules/seller-kyc/seller-kyc.service';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  SellerKycOverrideRepository,
} from 'src/modules/seller-kyc/repository';
import {
  PanProvider,
  GstProvider,
  AadhaarProvider,
  NameMatchProvider,
} from 'src/modules/seller-kyc/provider';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { UserRepository } from 'src/modules/auth/repository';
import { AppConfigService } from 'src/default/config/config.service';
import { KycStatus, KycType, SellerKycStatus } from 'src/default/common/enums/kyc.enum';
import { createMock } from '../utils/mock.util';

describe('SellerKycService', () => {
  let service: SellerKycService;
  let userRepository: jest.Mocked<UserRepository>;
  let userAuthValidator: jest.Mocked<UserAuthValidator>;
  let kycVerificationRepository: jest.Mocked<KycVerificationRepository>;
  let panProvider: jest.Mocked<PanProvider>;
  let nameMatchProvider: jest.Mocked<NameMatchProvider>;
  let sellerKycOverrideRepository: jest.Mocked<SellerKycOverrideRepository>;

  const HEX_KEY = 'a'.repeat(64); // 32 bytes, valid AES-256 key
  const HEX_IV = 'b'.repeat(32); // 16 bytes, valid IV

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SellerKycService,
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: KycVerificationRepository, useValue: createMock<KycVerificationRepository>() },
        {
          provide: KycVerificationLogRepository,
          useValue: createMock<KycVerificationLogRepository>(),
        },
        {
          provide: SellerKycOverrideRepository,
          useValue: createMock<SellerKycOverrideRepository>(),
        },
        { provide: UserAuthValidator, useValue: createMock<UserAuthValidator>() },
        { provide: NameMatchProvider, useValue: createMock<NameMatchProvider>() },
        { provide: PanProvider, useValue: createMock<PanProvider>() },
        { provide: AadhaarProvider, useValue: createMock<AadhaarProvider>() },
        { provide: GstProvider, useValue: createMock<GstProvider>() },
        { provide: AppConfigService, useValue: createMock<AppConfigService>() },
        { provide: EventEmitter2, useValue: createMock<EventEmitter2>() },
      ],
    }).compile();

    service = module.get(SellerKycService);
    userRepository = module.get(UserRepository);
    userAuthValidator = module.get(UserAuthValidator);
    kycVerificationRepository = module.get(KycVerificationRepository);
    panProvider = module.get(PanProvider);
    nameMatchProvider = module.get(NameMatchProvider);
    sellerKycOverrideRepository = module.get(SellerKycOverrideRepository);

    const appConfigService = module.get(AppConfigService);
    (appConfigService.get as jest.Mock).mockImplementation((key: string) =>
      key === 'KYC_ENCRYPTION_SECRET_KEY'
        ? HEX_KEY
        : key === 'KYC_ENCRYPTION_FIXED_IV'
          ? HEX_IV
          : undefined
    );

    userAuthValidator.getAllowedUserById.mockResolvedValue({
      id: 2,
      username: 'seller-user',
    } as any);
  });

  describe('verifyPan', () => {
    it('rejects when this seller already has a VERIFIED PAN', async () => {
      kycVerificationRepository.findByUserIdAndType.mockResolvedValue({
        status: KycStatus.VERIFIED,
      } as any);

      await expect(
        service.verifyPan(2, { panCard: 'ABCDE1234F', panImage: 'img' } as any)
      ).rejects.toMatchObject({ response: { errorCode: 'KYC_007' } });
    });

    it('rejects when this PAN document is already used by a different seller', async () => {
      kycVerificationRepository.findByUserIdAndType.mockResolvedValue(null);
      kycVerificationRepository.findByDocumentNumberAndType.mockResolvedValue({
        user: { id: 999 },
      } as any);

      await expect(
        service.verifyPan(2, { panCard: 'ABCDE1234F', panImage: 'img' } as any)
      ).rejects.toMatchObject({ response: { errorCode: 'KYC_008' } });
    });

    it('rejects when the name-match score is below threshold', async () => {
      kycVerificationRepository.findByUserIdAndType.mockResolvedValue(null);
      kycVerificationRepository.findByDocumentNumberAndType.mockResolvedValue(null);
      panProvider.verifyPan.mockResolvedValue({
        success: true,
        requestPayload: {},
        responseData: { data: { aadhaar_linked: 'successful', full_name: 'Someone Else' } },
        statusCode: 200,
        message: 'ok',
      } as any);
      nameMatchProvider.matchName.mockResolvedValue({
        success: true,
        requestPayload: {},
        responseData: { data: { match_score: 40 } },
        statusCode: 200,
        message: 'ok',
      } as any);

      await expect(
        service.verifyPan(2, { panCard: 'ABCDE1234F', panImage: 'img' } as any)
      ).rejects.toMatchObject({ response: { errorCode: 'KYC_005' } });
    });

    it('verifies successfully when the provider succeeds and the name matches', async () => {
      kycVerificationRepository.findByUserIdAndType.mockResolvedValue(null);
      kycVerificationRepository.findByDocumentNumberAndType.mockResolvedValue(null);
      panProvider.verifyPan.mockResolvedValue({
        success: true,
        requestPayload: {},
        responseData: { data: { aadhaar_linked: 'successful', full_name: 'seller-user' } },
        statusCode: 200,
        message: 'ok',
      } as any);
      panProvider.maskPanNumber.mockReturnValue('XXXXXX234F');
      nameMatchProvider.matchName.mockResolvedValue({
        success: true,
        requestPayload: {},
        responseData: { data: { match_score: 100 } },
        statusCode: 200,
        message: 'ok',
      } as any);
      kycVerificationRepository.upsertVerifiedKyc.mockResolvedValue({} as any);

      const result = await service.verifyPan(2, { panCard: 'ABCDE1234F', panImage: 'img' } as any);

      expect(result).toMatchObject({ verified: true, matchScore: 100 });
      expect(kycVerificationRepository.upsertVerifiedKyc).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    const verifiedRow = (type: KycType) => ({
      type,
      status: KycStatus.VERIFIED,
      updatedAt: new Date(),
    });

    it('derives NOT_STARTED when nothing is verified and there is no override', async () => {
      kycVerificationRepository.findAllByUserId.mockResolvedValue([]);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue(null);

      const profile = await service.getProfile(2);

      expect(profile.status).toBe('NOT_STARTED');
      expect(profile.kycApproved).toBe(false);
    });

    it('derives PENDING when 1-2 of 3 types are verified', async () => {
      kycVerificationRepository.findAllByUserId.mockResolvedValue([
        verifiedRow(KycType.PAN),
      ] as any);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue(null);

      const profile = await service.getProfile(2);

      expect(profile.status).toBe('PENDING');
      expect(profile.kycApproved).toBe(false);
    });

    it('derives USER_PROFILE_APPROVAL when all 3 are verified but there is no override — does NOT auto-approve', async () => {
      kycVerificationRepository.findAllByUserId.mockResolvedValue([
        verifiedRow(KycType.PAN),
        verifiedRow(KycType.GST),
        verifiedRow(KycType.AADHAAR),
      ] as any);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue(null);

      const profile = await service.getProfile(2);

      expect(profile.status).toBe('USER_PROFILE_APPROVAL');
      expect(profile.kycApproved).toBe(false);
    });

    it('derives APPROVED and kycApproved=true only with an explicit APPROVED override', async () => {
      kycVerificationRepository.findAllByUserId.mockResolvedValue([
        verifiedRow(KycType.PAN),
        verifiedRow(KycType.GST),
        verifiedRow(KycType.AADHAAR),
      ] as any);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue({
        status: SellerKycStatus.APPROVED,
        reason: null,
        reviewedAt: new Date(),
      } as any);

      const profile = await service.getProfile(2);

      expect(profile.status).toBe('APPROVED');
      expect(profile.kycApproved).toBe(true);
    });

    it('derives REJECTED from an explicit REJECTED override regardless of verified count', async () => {
      kycVerificationRepository.findAllByUserId.mockResolvedValue([]);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue({
        status: SellerKycStatus.REJECTED,
        reason: 'bad docs',
        reviewedAt: new Date(),
      } as any);

      const profile = await service.getProfile(2);

      expect(profile.status).toBe('REJECTED');
      expect(profile.kycApproved).toBe(false);
    });
  });

  describe('isSellerKycApproved', () => {
    it('is false even when all three KYC types are verified, without an explicit approval', async () => {
      kycVerificationRepository.findAllByUserId.mockResolvedValue([
        verifiedRowFor(KycType.PAN),
        verifiedRowFor(KycType.GST),
        verifiedRowFor(KycType.AADHAAR),
      ] as any);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue(null);

      await expect(service.isSellerKycApproved(2)).resolves.toBe(false);
    });

    function verifiedRowFor(type: KycType) {
      return { type, status: KycStatus.VERIFIED, updatedAt: new Date() };
    }
  });

  describe('review', () => {
    it('rejects approval with KYC_INCOMPLETE_FOR_APPROVAL, listing exactly the pending types', async () => {
      userRepository.findById.mockResolvedValue({ id: 2 } as any);
      kycVerificationRepository.findAllByUserId.mockResolvedValue([
        { type: KycType.PAN, status: KycStatus.VERIFIED, updatedAt: new Date() },
      ] as any);
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue(null);

      await expect(
        service.review(2, { status: SellerKycStatus.APPROVED, reviewerId: 1 })
      ).rejects.toMatchObject({
        response: {
          errorCode: 'SEL_008',
          message: expect.stringContaining('GST pending, Aadhaar pending'),
        },
      });
    });

    it('requires a reason when rejecting', async () => {
      userRepository.findById.mockResolvedValue({ id: 2 } as any);

      await expect(
        service.review(2, { status: SellerKycStatus.REJECTED, reviewerId: 1 })
      ).rejects.toMatchObject({ response: { errorCode: 'SEL_005' } });
    });

    it('allows rejecting even when KYC is completely unstarted, given a reason', async () => {
      userRepository.findById.mockResolvedValue({ id: 2 } as any);
      kycVerificationRepository.findAllByUserId.mockResolvedValue([]);
      sellerKycOverrideRepository.upsert.mockResolvedValue({} as any);
      // review() re-reads the profile after writing the override, via getProfile()
      // -> findBySellerId — reflect the just-written REJECTED override there.
      sellerKycOverrideRepository.findBySellerId.mockResolvedValue({
        status: SellerKycStatus.REJECTED,
        reason: 'incomplete',
        reviewedAt: new Date(),
      } as any);

      const result = await service.review(2, {
        status: SellerKycStatus.REJECTED,
        reason: 'incomplete',
        reviewerId: 1,
      });

      expect(sellerKycOverrideRepository.upsert).toHaveBeenCalled();
      expect(result.status).toBe('REJECTED');
    });
  });
});
