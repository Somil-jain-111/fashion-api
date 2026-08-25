import { Test } from '@nestjs/testing';
import { AdminReportsService } from 'src/modules/admin/services/admin-reports.service';
import { UserRepository } from 'src/modules/auth/repository';
import { ProductRepository } from 'src/modules/products/repository';
import { SellerKycService } from 'src/modules/seller-kyc/seller-kyc.service';
import { SellerKycOverallStatus } from 'src/default/common/enums/kyc.enum';
import { createMock } from '../utils/mock.util';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let userRepository: jest.Mocked<UserRepository>;
  let productRepository: jest.Mocked<ProductRepository>;
  let sellerKycService: jest.Mocked<SellerKycService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminReportsService,
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: ProductRepository, useValue: createMock<ProductRepository>() },
        { provide: SellerKycService, useValue: createMock<SellerKycService>() },
      ],
    }).compile();

    service = module.get(AdminReportsService);
    userRepository = module.get(UserRepository);
    productRepository = module.get(ProductRepository);
    sellerKycService = module.get(SellerKycService);
  });

  it('aggregates all counts, reading pendingKycCount off pagination.totalItems for the USER_PROFILE_APPROVAL queue', async () => {
    userRepository.countByRole.mockResolvedValueOnce(12).mockResolvedValueOnce(340);
    productRepository.count.mockResolvedValueOnce(5).mockResolvedValueOnce(80);
    sellerKycService.listForAdmin.mockResolvedValue({
      items: [],
      pagination: { totalItems: 3, currentPage: 1, pageSize: 1, totalPages: 3 },
    } as any);

    const result = await service.getOverview();

    expect(result).toEqual({
      totalSellers: 12,
      totalRetailers: 340,
      pendingKycCount: 3,
      pendingProductCount: 5,
      approvedProductCount: 80,
    });
    expect(sellerKycService.listForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ status: SellerKycOverallStatus.USER_PROFILE_APPROVAL })
    );
  });
});
