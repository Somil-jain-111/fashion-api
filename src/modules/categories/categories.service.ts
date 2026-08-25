import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { SellerKycService } from '../seller-kyc/seller-kyc.service';
import { CategoryRepository } from './repository';
import { Category } from './entities';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryNode = Category & { children: CategoryNode[] };

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly sellerKycService: SellerKycService
  ) {}

  /**
   * Sellers may only create subcategories (assertCanSetParent already blocks
   * them from creating top-level ones) once their KYC is approved — this is
   * part of the same pre-upload gate as product creation, not a separate rule.
   */
  private async assertSellerCanCreateCategory(requesterId: number, requesterRole: string[]): Promise<void> {
    const isSeller = requesterRole.includes(UserRole.SELLER_ADMIN) && !requesterRole.includes(UserRole.SUPERADMIN) && !requesterRole.includes(UserRole.ADMIN);

    if (!isSeller) {
      return;
    }

    const kycApproved = await this.sellerKycService.isSellerKycApproved(requesterId);

    if (!kycApproved) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_SELLER_KYC_NOT_APPROVED);
    }
  }

  private assertCanSetParent(parentId: number | null | undefined, requesterRole: string[]): void {
    const isTopLevel = parentId === null || parentId === undefined;

    if (isTopLevel && !requesterRole.includes(UserRole.SUPERADMIN)) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_TOP_LEVEL_NOT_ALLOWED);
    }
  }

  private async assertParentExists(parentId: number): Promise<void> {
    const parent = await this.categoryRepository.findById(parentId);

    if (!parent) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_NOT_FOUND);
    }
  }

  private async assertNoCycle(categoryId: number, newParentId: number): Promise<void> {
    // Bigint columns come back from TypeORM/mysql2 as strings, not numbers — every
    // id read off an entity must be normalized before comparing, or `===` silently
    // never matches (found via real-DB testing: this let an actual cycle get written).
    let currentId: number | null = Number(newParentId);
    const targetId = Number(categoryId);
    let hops = 0;

    while (currentId !== null && hops < 100) {
      if (currentId === targetId) {
        throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_CIRCULAR_REFERENCE);
      }

      const current = await this.categoryRepository.findById(currentId);
      currentId = current?.parentId != null ? Number(current.parentId) : null;
      hops += 1;
    }
  }

  private buildTree(categories: Category[]): CategoryNode[] {
    const byId = new Map<number, CategoryNode>();

    for (const category of categories) {
      byId.set(Number(category.id), { ...category, children: [] });
    }

    const roots: CategoryNode[] = [];

    for (const node of byId.values()) {
      const parentId = node.parentId != null ? Number(node.parentId) : null;

      if (parentId !== null && byId.has(parentId)) {
        byId.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getTree(flat: boolean): Promise<Category[] | CategoryNode[]> {
    const categories = await this.categoryRepository.findActive();

    return flat ? categories : this.buildTree(categories);
  }

  async getById(id: number): Promise<Category & { children: Category[] }> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_NOT_FOUND);
    }

    const children = await this.categoryRepository.findChildren(id);

    return { ...category, children };
  }

  async create(dto: CreateCategoryDto, requesterId: number, requesterRole: string[]): Promise<Category> {
    this.assertCanSetParent(dto.parentId, requesterRole);
    await this.assertSellerCanCreateCategory(requesterId, requesterRole);

    if (dto.parentId) {
      await this.assertParentExists(dto.parentId);
    }

    const existingSlug = await this.categoryRepository.findBySlug(dto.slug);

    if (existingSlug) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_ALREADY_EXISTS);
    }

    return await this.categoryRepository.save({
      name: dto.name,
      slug: dto.slug,
      parentId: dto.parentId ?? null,
      imageUrl: dto.imageUrl ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async update(id: number, dto: UpdateCategoryDto, requesterRole: string[]): Promise<Category> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_NOT_FOUND);
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existingSlug = await this.categoryRepository.findBySlug(dto.slug);

      if (existingSlug) {
        throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_ALREADY_EXISTS);
      }
    }

    const isParentIdProvided = Object.prototype.hasOwnProperty.call(dto, 'parentId');

    if (isParentIdProvided) {
      this.assertCanSetParent(dto.parentId, requesterRole);

      if (dto.parentId) {
        await this.assertParentExists(dto.parentId);
        await this.assertNoCycle(id, dto.parentId);
      }
    }

    const payload: Partial<Category> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(isParentIdProvided && { parentId: dto.parentId ?? null }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    };

    const updated = await this.categoryRepository.updateById(id, payload);

    if (!updated) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_UPDATE_FAILED);
    }

    return { ...category, ...payload } as Category;
  }

  async remove(id: number): Promise<void> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_NOT_FOUND);
    }

    const activeChildren = await this.categoryRepository.countActiveChildren(id);

    if (activeChildren > 0) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_HAS_CHILDREN);
    }

    const hasProducts = await this.categoryRepository.hasActiveProducts(id);

    if (hasProducts) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_HAS_PRODUCTS);
    }

    await this.categoryRepository.softDeleteById(id);
  }
}
