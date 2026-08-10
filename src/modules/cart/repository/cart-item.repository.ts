import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { CartItem } from '../entities/cart-items.entity';

@Injectable()
export class CartItemRepository extends BaseRepository<CartItem> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(CartItem));
  }

  async findDuplicateItem(
    input: {
      cartId: string | number;
      productId: number;
      color: string;
      size: string;
      cartonSize: number;
    },
    queryRunner?: QueryRunner
  ): Promise<CartItem | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CartItem) : this.repository;

    const qb = repo
      .createQueryBuilder('item')
      .where('item.cart = :cartId', { cartId: Number(input.cartId) })
      .andWhere('item.productId = :productId', { productId: input.productId })
      .andWhere('item.color = :color', { color: input.color })
      .andWhere('item.size = :size', { size: input.size })
      .andWhere('item.cartonSize = :cartonSize', { cartonSize: input.cartonSize });

    // Pessimistic write lock requires an active transaction (queryRunner) to avoid
    // two concurrent addItem calls both reading the same starting quantity.
    if (queryRunner) {
      qb.setLock('pessimistic_write');
    }

    return qb.getOne();
  }

  async findByIdAndUser(itemId: string, userId: string | number): Promise<CartItem | null> {
    return this.repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.cart', 'cart')
      .leftJoinAndSelect('cart.user', 'user')
      .leftJoinAndSelect('cart.distributor', 'distributor')
      .leftJoinAndSelect('cart.items', 'items')
      .where('item.id = :itemId', { itemId })
      .andWhere('cart.user_id = :userId', { userId })
      .andWhere('cart.is_active = true')
      .getOne();
  }

  async deleteByCartId(cartId: string | number, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CartItem) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .delete()
      .where("cart_id = :cartId", { cartId })
      .execute();
    return Number(result.affected ?? 0);
  }
}
