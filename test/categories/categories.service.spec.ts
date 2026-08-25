import { Test } from '@nestjs/testing';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { CategoryRepository } from 'src/modules/categories/repository';
import { SellerKycService } from 'src/modules/seller-kyc/seller-kyc.service';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { createMock } from '../utils/mock.util';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let sellerKycService: jest.Mocked<SellerKycService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoryRepository, useValue: createMock<CategoryRepository>() },
        { provide: SellerKycService, useValue: createMock<SellerKycService>() },
      ],
    }).compile();

    service = module.get(CategoriesService);
    categoryRepository = module.get(CategoryRepository);
    sellerKycService = module.get(SellerKycService);
  });

  describe('create', () => {
    it('blocks a non-superadmin from creating a top-level category', async () => {
      await expect(
        service.create({ name: 'Shoes', slug: 'shoes' } as any, 2, [UserRole.SELLER_ADMIN])
      ).rejects.toMatchObject({ response: { errorCode: 'CAT_006' } });
    });

    it('blocks a seller without approved KYC from creating a subcategory', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(false);

      await expect(
        service.create({ name: 'Sneakers', slug: 'sneakers', parentId: 1 } as any, 2, [
          UserRole.SELLER_ADMIN,
        ])
      ).rejects.toMatchObject({ response: { errorCode: 'CAT_009' } });
    });

    it('allows an approved seller to create a subcategory', async () => {
      sellerKycService.isSellerKycApproved.mockResolvedValue(true);
      categoryRepository.findById.mockResolvedValue({ id: 1 } as any);
      categoryRepository.findBySlug.mockResolvedValue(null);
      categoryRepository.save.mockResolvedValue({ id: 2, name: 'Sneakers' } as any);

      const result = await service.create(
        { name: 'Sneakers', slug: 'sneakers', parentId: 1 } as any,
        2,
        [UserRole.SELLER_ADMIN]
      );

      expect(result).toMatchObject({ id: 2 });
    });

    it('does not gate a superadmin on KYC at all, even for a top-level category', async () => {
      categoryRepository.findBySlug.mockResolvedValue(null);
      categoryRepository.save.mockResolvedValue({ id: 3 } as any);

      await service.create({ name: 'Shoes', slug: 'shoes' } as any, 1, [UserRole.SUPERADMIN]);

      expect(sellerKycService.isSellerKycApproved).not.toHaveBeenCalled();
    });

    it('rejects a duplicate slug', async () => {
      categoryRepository.findBySlug.mockResolvedValue({ id: 9 } as any);

      await expect(
        service.create({ name: 'Shoes', slug: 'shoes' } as any, 1, [UserRole.SUPERADMIN])
      ).rejects.toMatchObject({ response: { errorCode: 'CAT_002' } });
    });
  });

  describe('update', () => {
    it("detects a circular reference when a category is set as its own descendant's parent", async () => {
      // Tree: 1 (root) -> 2 -> 3. Attempting to set 1's parent to 3 (a descendant of 1) must fail.
      categoryRepository.findById.mockImplementation(async (id: any) => {
        const nodes: Record<number, any> = {
          1: { id: 1, slug: 'root', parentId: null },
          2: { id: 2, slug: 'mid', parentId: 1 },
          3: { id: 3, slug: 'leaf', parentId: 2 },
        };
        return nodes[Number(id)] ?? null;
      });

      await expect(
        service.update(1, { parentId: 3 } as any, [UserRole.SUPERADMIN])
      ).rejects.toMatchObject({ response: { errorCode: 'CAT_007' } });
    });
  });

  describe('remove', () => {
    it('blocks deletion when the category has active children', async () => {
      categoryRepository.findById.mockResolvedValue({ id: 1 } as any);
      categoryRepository.countActiveChildren.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toMatchObject({ response: { errorCode: 'CAT_008' } });
    });

    it('blocks deletion when the category has active products', async () => {
      categoryRepository.findById.mockResolvedValue({ id: 1 } as any);
      categoryRepository.countActiveChildren.mockResolvedValue(0);
      categoryRepository.hasActiveProducts.mockResolvedValue(true);

      await expect(service.remove(1)).rejects.toMatchObject({ response: { errorCode: 'CAT_004' } });
    });

    it('soft-deletes when there are no children or products', async () => {
      categoryRepository.findById.mockResolvedValue({ id: 1 } as any);
      categoryRepository.countActiveChildren.mockResolvedValue(0);
      categoryRepository.hasActiveProducts.mockResolvedValue(false);
      categoryRepository.softDeleteById.mockResolvedValue(true as any);

      await service.remove(1);

      expect(categoryRepository.softDeleteById).toHaveBeenCalledWith(1);
    });
  });

  describe('getTree', () => {
    it('nests children under their parent when flat=false', async () => {
      categoryRepository.findActive.mockResolvedValue([
        { id: 1, parentId: null, name: 'Shoes' },
        { id: 2, parentId: 1, name: 'Sneakers' },
        { id: 3, parentId: 2, name: 'Running' },
      ] as any);

      const tree = await service.getTree(false);

      expect(tree).toHaveLength(1);
      expect((tree[0] as any).children[0].children[0].name).toBe('Running');
    });

    it('returns the flat list unchanged when flat=true', async () => {
      categoryRepository.findActive.mockResolvedValue([{ id: 1, parentId: null }] as any);

      const result = await service.getTree(true);

      expect(result).toEqual([{ id: 1, parentId: null }]);
    });
  });
});
