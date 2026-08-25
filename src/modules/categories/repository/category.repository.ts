import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { Category } from '../entities';

@Injectable()
export class CategoryRepository extends BaseRepository<Category> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource.getRepository(Category));
  }

  async findBySlug(slug: string, queryRunner?: QueryRunner): Promise<Category | null> {
    return await this.getRepository(queryRunner).findOne({ where: { slug } });
  }

  async findActive(queryRunner?: QueryRunner): Promise<Category[]> {
    return await this.getRepository(queryRunner).find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' } as any,
    });
  }

  async findChildren(parentId: number, queryRunner?: QueryRunner): Promise<Category[]> {
    return await this.getRepository(queryRunner).find({
      where: { parentId } as any,
      order: { sortOrder: 'ASC', id: 'ASC' } as any,
    });
  }

  async countActiveChildren(parentId: number, queryRunner?: QueryRunner): Promise<number> {
    return await this.getRepository(queryRunner).count({
      where: { parentId, isActive: true } as any,
    });
  }

  /**
   * Deliberately avoids importing the Products module/entity (would create a
   * Categories<->Products module cycle) — a raw parameterized existence check
   * against the `products` table is enough for this one delete-guard.
   */
  async hasActiveProducts(categoryId: number): Promise<boolean> {
    const rows = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND deleted_at IS NULL',
      [categoryId]
    );

    return Number(rows?.[0]?.count ?? 0) > 0;
  }

  /**
   * `categoryId` + every descendant, breadth-first via repeated `findChildren` calls
   * rather than a `WITH RECURSIVE` CTE — same simplicity tradeoff as the tree read in
   * CategoriesService, sufficient at category-tree scale. Used by the catalog's
   * "categoryId matches this category OR any descendant" filter.
   */
  async findDescendantIds(categoryId: number): Promise<number[]> {
    const ids = [Number(categoryId)];
    let frontier = [Number(categoryId)];
    let hops = 0;

    while (frontier.length > 0 && hops < 20) {
      const children = (
        await Promise.all(frontier.map((id) => this.findChildren(id)))
      ).flat();

      const childIds = children.map((c) => Number(c.id));
      ids.push(...childIds);
      frontier = childIds;
      hops += 1;
    }

    return ids;
  }

  /**
   * Root-to-leaf chain for a category breadcrumb, walking up via `parentId`
   * (bounded, occasional read — not worth a recursive CTE).
   */
  async findAncestorChain(categoryId: number): Promise<Category[]> {
    const chain: Category[] = [];
    let currentId: number | null = Number(categoryId);
    let hops = 0;

    while (currentId !== null && hops < 100) {
      const current = await this.findById(currentId);

      if (!current) break;

      chain.unshift(current);
      currentId = current.parentId != null ? Number(current.parentId) : null;
      hops += 1;
    }

    return chain;
  }
}
