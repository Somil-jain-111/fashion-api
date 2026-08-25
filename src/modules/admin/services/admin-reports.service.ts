import { Injectable } from '@nestjs/common';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { SellerKycOverallStatus } from 'src/default/common/enums/kyc.enum';
import { UserRepository } from '../../auth/repository';
import { ProductRepository } from '../../products/repository';
import { SellerKycService } from '../../seller-kyc/seller-kyc.service';

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly productRepository: ProductRepository,
    private readonly sellerKycService: SellerKycService
  ) {}

  async getOverview() {
    const [totalSellers, totalRetailers, pendingProducts, approvedProducts, pendingKyc] =
      await Promise.all([
        this.userRepository.countByRole(UserRole.SELLER_ADMIN),
        this.userRepository.countByRole(UserRole.CUSTOMER),
        this.productRepository.count({ where: { status: ProductStatus.PENDING_APPROVAL } }),
        this.productRepository.count({ where: { status: ProductStatus.APPROVED } }),
        this.sellerKycService.listForAdmin({
          status: SellerKycOverallStatus.USER_PROFILE_APPROVAL,
          page: 1,
          limit: 1,
        }),
      ]);

    return {
      totalSellers,
      totalRetailers,
      pendingKycCount: pendingKyc.pagination.totalItems,
      pendingProductCount: pendingProducts,
      approvedProductCount: approvedProducts,
    };
  }
}
