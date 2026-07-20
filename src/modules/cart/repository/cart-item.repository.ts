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

    return repo.findOne({
      where: {
        cart_id: String(input.cartId),
        productId: input.productId,
        color: input.color,
        size: input.size,
        cartonSize: input.cartonSize,
      } as any,
    });
  }

  async findByIdAndUser(itemId: string, userId: string | number): Promise<CartItem | null> {
    return this.repository.findOne({
      where: {
        id: itemId,
        cart: {
          user_id: String(userId),
          is_active: true,
        },
      } as any,
      relations: ['cart', 'cart.items'],
    });
  }

  async deleteByCartId(cartId: string | number, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CartItem) : this.repository;
    const result = await repo.delete({ cart_id: String(cartId) } as any);
    return Number(result.affected ?? 0);
  }
}
