import { Test } from '@nestjs/testing';
import { CatalogService } from 'src/modules/catalog/catalog.service';
import { ProductRepository } from 'src/modules/products/repository';
import { CategoryRepository } from 'src/modules/categories/repository';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { UserRepository } from 'src/modules/auth/repository';
import { SellerKycService } from 'src/modules/seller-kyc/seller-kyc.service';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';
import { createMock, createChainableQueryBuilderMock } from '../utils/mock.util';

describe('CatalogService', () => {
  let service: CatalogService;
  let productRepository: jest.Mocked<ProductRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let sellerKycService: jest.Mocked<SellerKycService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: ProductRepository, useValue: createMock<ProductRepository>() },
        { provide: CategoryRepository, useValue: createMock<CategoryRepository>() },
        { provide: CategoriesService, useValue: createMock<CategoriesService>() },
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: SellerKycService, useValue: createMock<SellerKycService>() },
      ],
    }).compile();

    service = module.get(CatalogService);
    productRepository = module.get(ProductRepository);
    categoryRepository = module.get(CategoryRepository);
    userRepository = module.get(UserRepository);
    sellerKycService = module.get(SellerKycService);
  });

  describe('getProductDetail', () => {
    it('throws PRODUCT_NOT_FOUND when no approved+visible product matches', async () => {
      const qb = createChainableQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.getProductDetail(1)).rejects.toMatchObject({
        response: { errorCode: 'PRD_001' },
      });
    });

    it('returns the product with a breadcrumb when found', async () => {
      const qb = createChainableQueryBuilderMock();
      qb.getOne.mockResolvedValue({
        id: 1,
        name: 'Shoe',
        categoryId: 5,
        variants: [],
        images: [],
        seller: null,
      });
      productRepository.createQueryBuilder.mockReturnValue(qb);
      categoryRepository.findAncestorChain.mockResolvedValue([
        { id: 5, name: 'Shoes', slug: 'shoes' },
      ] as any);

      const result = await service.getProductDetail(1);

      expect(result.id).toBe(1);
      expect(result.categoryBreadcrumb).toEqual([{ id: 5, name: 'Shoes', slug: 'shoes' }]);
    });
  });

  describe('getSellerProfile', () => {
    it('throws SELLER_NOT_FOUND when the seller does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getSellerProfile(2)).rejects.toMatchObject({
        response: { errorCode: 'SEL_002' },
      });
    });

    it('throws SELLER_NOT_FOUND when the seller is not KYC-approved, even if active', async () => {
      userRepository.findById.mockResolvedValue({ id: 2, status: UserStatus.ACTIVE } as any);
      sellerKycService.isSellerKycApproved.mockResolvedValue(false);

      await expect(service.getSellerProfile(2)).rejects.toMatchObject({
        response: { errorCode: 'SEL_002' },
      });
    });

    it('returns the seller profile when active and approved', async () => {
      userRepository.findById.mockResolvedValue({
        id: 2,
        status: UserStatus.ACTIVE,
        firmName: 'Sprint Footwear',
        ratingAverage: '4.50',
        createdAt: new Date('2026-01-01'),
      } as any);
      sellerKycService.isSellerKycApproved.mockResolvedValue(true);
      const qb = createChainableQueryBuilderMock();
      qb.getCount.mockResolvedValue(7);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSellerProfile(2);

      expect(result).toMatchObject({ id: 2, businessName: 'Sprint Footwear', productCount: 7 });
    });
  });

  describe('listProducts', () => {
    it('wires minPrice/maxPrice/zone filters into the query when present', async () => {
      const qb = createChainableQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      categoryRepository.findDescendantIds.mockResolvedValue([1, 2, 3]);

      await service.listProducts({
        minPrice: 100,
        maxPrice: 500,
        zone: 'RETAIL',
        categoryId: 1,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('product.basePrice >= :minPrice', { minPrice: 100 });
      expect(qb.andWhere).toHaveBeenCalledWith('product.basePrice <= :maxPrice', { maxPrice: 500 });
      expect(qb.andWhere).toHaveBeenCalledWith('product.zone = :zone', { zone: 'RETAIL' });
      expect(qb.andWhere).toHaveBeenCalledWith('product.categoryId IN (:...categoryIds)', {
        categoryIds: [1, 2, 3],
      });
    });

    it('paginates using the requested page/limit', async () => {
      const qb = createChainableQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listProducts({ page: 2, limit: 10 } as any);

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.page).toBe(2);
    });
  });
});
