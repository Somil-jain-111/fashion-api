import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductsService } from 'src/modules/products/products.service';
import {
  ProductRepository,
  ProductVariantRepository,
  ProductImageRepository,
  ProductOptionRepository,
} from 'src/modules/products/repository';
import { CategoryRepository } from 'src/modules/categories/repository';
import { SellerKycService } from 'src/modules/seller-kyc/seller-kyc.service';
import { TransactionService } from 'src/default/databases/transaction';
import { ProductStatus, ProductZone } from 'src/default/common/enums/product.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { createMock } from '../utils/mock.util';
import { ContentAuditRepository } from 'src/default/common/repositories/content-audit.repository';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: jest.Mocked<ProductRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let productOptionRepository: jest.Mocked<ProductOptionRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let sellerKycService: jest.Mocked<SellerKycService>;
  let transactionService: jest.Mocked<TransactionService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: createMock<ProductRepository>() },
        { provide: ProductVariantRepository, useValue: createMock<ProductVariantRepository>() },
        { provide: ProductImageRepository, useValue: createMock<ProductImageRepository>() },
        { provide: ProductOptionRepository, useValue: createMock<ProductOptionRepository>() },
        { provide: CategoryRepository, useValue: createMock<CategoryRepository>() },
        { provide: SellerKycService, useValue: createMock<SellerKycService>() },
        { provide: TransactionService, useValue: createMock<TransactionService>() },
        { provide: EventEmitter2, useValue: createMock<EventEmitter2>() },
        { provide: ContentAuditRepository, useValue: createMock<ContentAuditRepository>() },
      ],
    }).compile();

    service = module.get(ProductsService);
    productRepository = module.get(ProductRepository);
    productVariantRepository = module.get(ProductVariantRepository);
    productOptionRepository = module.get(ProductOptionRepository);
    categoryRepository = module.get(CategoryRepository);
    sellerKycService = module.get(SellerKycService);
    transactionService = module.get(TransactionService);
    (module.get(ProductOptionRepository).findActiveByIds as jest.Mock).mockResolvedValue([]);

    // runInTransaction just invokes the callback with a stand-in queryRunner —
    // the repository mocks passed a queryRunner don't care about its shape.
    (transactionService.runInTransaction as jest.Mock).mockImplementation((cb: any) => cb({}));
  });

  describe('create', () => {
    const dto = {
      categoryId: 999,
      name: 'Shoe',
      basePrice: 100,
      zone: ProductZone.RETAIL,
      variants: [{ size: 'UK9', sku: 'SKU-1', stockQuantity: 5 }],
    } as any;

    it('checks the seller KYC gate before ever looking at categoryId — an unapproved seller is blocked even with a nonexistent category', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(false);

      await expect(service.create(2, dto)).rejects.toMatchObject({
        response: { errorCode: 'PRD_006' },
      });

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });

    it('rejects a duplicate SKU for an approved seller', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(true);
      categoryRepository.findById.mockResolvedValue({ id: 999, status: 'APPROVED' } as any);
      productVariantRepository.findBySku.mockResolvedValue({ productId: 555 } as any);

      await expect(service.create(2, dto)).rejects.toMatchObject({
        response: { errorCode: 'PRD_010' },
      });
    });

    it('derives currentPrice from mrp and discountPercentage', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(true);
      categoryRepository.findById.mockResolvedValue({ id: 999, status: 'APPROVED' } as any);
      productVariantRepository.findBySku.mockResolvedValue(null);
      productRepository.save.mockResolvedValue({ id: 1 } as any);
      productVariantRepository.save.mockResolvedValue({ id: 10 } as any);

      await service.create(2, { ...dto, mrp: 200, discountPercentage: 25 });

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentPrice: 150 }),
        expect.anything()
      );
    });

    it('leaves currentPrice null when no mrp is given', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(true);
      categoryRepository.findById.mockResolvedValue({ id: 999, status: 'APPROVED' } as any);
      productVariantRepository.findBySku.mockResolvedValue(null);
      productRepository.save.mockResolvedValue({ id: 1 } as any);
      productVariantRepository.save.mockResolvedValue({ id: 10 } as any);

      await service.create(2, dto);

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentPrice: null }),
        expect.anything()
      );
    });
  });

  describe('update / remove — ownership', () => {
    it("rejects a non-owner, non-admin from updating someone else's product", async () => {
      productRepository.findByIdWithRelations.mockResolvedValue({ id: 1, sellerId: 99 } as any);

      await expect(
        service.update(1, {} as any, { id: 2, role: [UserRole.SELLER_ADMIN] })
      ).rejects.toMatchObject({ response: { errorCode: 'PRD_009' } });
    });

    it("rejects a non-owner, non-admin from removing someone else's product", async () => {
      productRepository.findById.mockResolvedValue({ id: 1, sellerId: 99 } as any);

      await expect(
        service.remove(1, { id: 2, role: [UserRole.SELLER_ADMIN] })
      ).rejects.toMatchObject({ response: { errorCode: 'PRD_009' } });
    });

    it('sends a rejected seller product back for approval after correction', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(true);
      productRepository.findByIdWithRelations
        .mockResolvedValueOnce({
          id: 1,
          sellerId: 2,
          status: ProductStatus.REJECTED,
          rejectionReason: 'Fix title',
          variants: [],
        } as any)
        .mockResolvedValueOnce({
          id: 1,
          sellerId: 2,
          name: 'Correct title',
          status: ProductStatus.PENDING_APPROVAL,
        } as any);

      await service.update(1, { name: 'Correct title' } as any, {
        id: 2,
        role: [UserRole.SELLER_ADMIN],
      });

      expect(productRepository.updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Correct title',
          status: ProductStatus.PENDING_APPROVAL,
          rejectionReason: null,
        }),
        expect.anything()
      );
    });

    it('allows an admin to update a product they do not own', async () => {
      productRepository.findByIdWithRelations.mockResolvedValue({
        id: 1,
        sellerId: 99,
        status: ProductStatus.PENDING_APPROVAL,
        variants: [],
      } as any);
      productRepository.updateById.mockResolvedValue(true as any);

      await service.update(1, { name: 'New name' } as any, { id: 2, role: [UserRole.SUPERADMIN] });

      expect(productRepository.updateById).toHaveBeenCalled();
    });
  });

  describe('approve / reject', () => {
    it('only operates on PENDING_APPROVAL products', async () => {
      productRepository.findById.mockResolvedValue({
        id: 1,
        status: ProductStatus.APPROVED,
      } as any);

      await expect(service.approve(1, 10)).rejects.toMatchObject({
        response: { errorCode: 'PRD_008' },
      });
    });

    it('approves a pending product and stamps the reviewer', async () => {
      productRepository.findById
        .mockResolvedValueOnce({ id: 1, status: ProductStatus.PENDING_APPROVAL } as any)
        .mockResolvedValueOnce({ id: 1, status: ProductStatus.APPROVED } as any);
      productRepository.updateById.mockResolvedValue(true as any);

      const result = await service.approve(1, 10);

      expect(productRepository.updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: ProductStatus.APPROVED, reviewedBy: 10 }),
        expect.anything()
      );
      expect(result.status).toBe(ProductStatus.APPROVED);
    });

    it('rejects a pending product with a reason', async () => {
      productRepository.findById
        .mockResolvedValueOnce({ id: 1, status: ProductStatus.PENDING_APPROVAL } as any)
        .mockResolvedValueOnce({ id: 1, status: ProductStatus.REJECTED } as any);
      productRepository.updateById.mockResolvedValue(true as any);

      await service.reject(1, 'bad photos', 10);

      expect(productRepository.updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: ProductStatus.REJECTED, rejectionReason: 'bad photos' }),
        expect.anything()
      );
    });
  });

  describe('admin product reads', () => {
    it('returns seller basics without exposing the seller entity or password', async () => {
      productRepository.findPaginatedForAdmin.mockResolvedValue([
        [
          {
            id: 1,
            name: 'Dress',
            seller: {
              id: 2,
              username: 'Priya',
              email: 'seller@example.com',
              password: 'must-not-leak',
              storeInformation: {
                storeName: 'Ethereal Threads',
                businessType: 'INDIVIDUAL',
                onboardingStatus: 'APPROVED',
              },
            },
          } as any,
        ],
        1,
      ]);

      const result = await service.adminList({ page: 1, limit: 20 });

      expect(result.items[0].sellerBasicDetails).toEqual(
        expect.objectContaining({
          id: '2',
          username: 'Priya',
          storeName: 'Ethereal Threads',
        })
      );
      expect(result.items[0]).not.toHaveProperty('seller');
      expect(JSON.stringify(result.items[0])).not.toContain('must-not-leak');
    });
  });

  describe('seller product dropdowns', () => {
    it('returns material, fit, neck, sleeve and occasion values from the database', async () => {
      categoryRepository.findActive.mockResolvedValue([]);
      productOptionRepository.findActive.mockResolvedValue([
        { id: 1, group: 'MATERIAL', code: 'COTTON', label: 'Cotton' },
        { id: 2, group: 'FIT', code: 'REGULAR', label: 'Regular Fit' },
        { id: 3, group: 'NECK_TYPE', code: 'ROUND', label: 'Round Neck' },
        { id: 4, group: 'SLEEVE', code: 'LONG', label: 'Long Sleeve' },
        { id: 5, group: 'OCCASION', code: 'CASUAL', label: 'Casual' },
      ] as any);

      const result = await service.getFormOptions();

      expect(result.dropdowns.materials).toHaveLength(1);
      expect(result.dropdowns.fits).toHaveLength(1);
      expect(result.dropdowns.neckTypes).toHaveLength(1);
      expect(result.dropdowns.sleeves).toHaveLength(1);
      expect(result.dropdowns.occasions).toHaveLength(1);
    });
  });
});
