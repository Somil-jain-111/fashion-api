import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

import products from 'src/modules/products/mock/products.json';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { TransactionService } from 'src/default/databases/transaction';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { CartItemResponseDto, CartResponseDto } from './dto/cart-response.dto';
import { CartCalculationHelper } from './helper/cart-calculation.helper';
import { CartItemRepository, CartRepository } from './repository';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-items.entity';

type ProductMock = {
  id: number;
  categoryId: number;
  subCategoryId: number;
  name: string;
  thumbnail: string;
  price: number;
  mrp: number;
  discount: number;
  colors: Array<{ name: string; code: string }>;
  sizes: Array<{ size: string; isAvailable: boolean }>;
  cartons: Array<{ articles: number; sizes: string[] }>;
};

@Injectable()
export class CartService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly cartRepository: CartRepository,
    private readonly cartItemRepository: CartItemRepository
  ) {}

  async addItem(userId: string | number, dto: CreateCartDto): Promise<CartResponseDto> {
    const tag = 'CartService.addItem';
    ConsoleLogger.log('ADD_CART_ITEM_START', { tag, data: { userId, productId: dto.productId } });

    const product = this.getProductOrThrow(dto.productId);
    this.validateVariant(product, dto);

    try {
      await this.transactionService.runInTransaction(async (queryRunner) => {
        let cart = await this.cartRepository.findActiveByUserAndDistributor(
          userId,
          dto.distributorId,
          queryRunner
        );

        if (!cart) {
          cart = await this.cartRepository.save(
            {
              user: { id: Number(userId) },
              distributor: { id: Number(dto.distributorId) },
              is_active: true,
            },
            queryRunner
          );
          cart.items = [];
        }

        const existingItem = await this.cartItemRepository.findDuplicateItem(
          {
            cartId: cart.id,
            productId: dto.productId,
            color: dto.color,
            size: dto.size,
            cartonSize: dto.cartonSize,
          },
          queryRunner
        );

        const cartonQuantity = dto.cartonQuantity ?? 1;
        const nextQuantity = existingItem
          ? Number(existingItem.cartonQuantity) + cartonQuantity
          : cartonQuantity;
        const totals = CartCalculationHelper.calculateItem({
          cartonSize: dto.cartonSize,
          cartonQuantity: nextQuantity,
          unitPrice: Number(product.price),
          mrp: Number(product.mrp),
        });

        if (existingItem) {
          await this.cartItemRepository.save(
            {
              ...existingItem,
              cartonQuantity: nextQuantity,
              totalArticles: totals.totalArticles,
              discount: totals.discount,
              totalAmount: totals.totalAmount,
              isSelected: dto.isSelected ?? existingItem.isSelected,
            },
            queryRunner
          );
        } else {
          await this.cartItemRepository.save(
            {
              cart: { id: cart.id },
              productId: product.id,
              categoryId: product.categoryId,
              subCategoryId: product.subCategoryId,
              color: dto.color,
              size: dto.size,
              cartonSize: dto.cartonSize,
              cartonQuantity,
              totalArticles: totals.totalArticles,
              unitPrice: product.price,
              mrp: product.mrp,
              discount: totals.discount,
              totalAmount: totals.totalAmount,
              isSelected: dto.isSelected ?? true,
            },
            queryRunner
          );
        }

        const freshCart = await this.cartRepository.findActiveByUserAndDistributor(
          userId,
          dto.distributorId,
          queryRunner
        );
        await this.refreshCartSummary(freshCart!, queryRunner);
      });

      ConsoleLogger.log('ADD_CART_ITEM_SUCCESS', {
        tag,
        data: { userId, productId: dto.productId },
      });
      return this.getCart(userId, dto.distributorId);
    } catch (error) {
      ConsoleLogger.error('ADD_CART_ITEM_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  async getCart(
    userId: string | number,
    distributorId?: string | number
  ): Promise<CartResponseDto> {
    const cart = distributorId
      ? await this.cartRepository.findActiveByUserAndDistributor(userId, distributorId)
      : await this.cartRepository.findLatestActiveByUser(userId);

    if (!cart) {
      return this.emptyCartResponse(userId, distributorId);
    }

    return await this.toResponse(cart);
  }

  async updateItem(
    userId: string | number,
    itemId: string,
    dto: UpdateCartDto
  ): Promise<CartResponseDto> {
    const item = await this.cartItemRepository.findByIdAndUser(itemId, userId);

    if (!item) {
      throw new BusinessException(ERROR_CODES.CART.CART_ITEM_NOT_FOUND);
    }

    const product = this.getProductOrThrow(item.productId);
    const cartonQuantity = this.resolveCartonQuantity(item.cartonQuantity, dto.cartonQuantity);
    const totals = CartCalculationHelper.calculateItem({
      cartonSize: item.cartonSize,
      cartonQuantity,
      unitPrice: Number(product.price),
      mrp: Number(product.mrp),
    });

    await this.cartItemRepository.save({
      ...item,
      cartonQuantity,
      totalArticles: totals.totalArticles,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      isSelected: dto.isSelected ?? item.isSelected,
    });

    const cart = await this.cartRepository.findActiveByUserAndDistributor(
      userId,
      item.cart.distributor.id
    );
    await this.refreshCartSummary(cart!);

    return this.getCart(userId, item.cart.distributor.id);
  }

  async removeItem(userId: string | number, itemId: string): Promise<CartResponseDto> {
    const item = await this.cartItemRepository.findByIdAndUser(itemId, userId);

    if (!item) {
      throw new BusinessException(ERROR_CODES.CART.CART_ITEM_NOT_FOUND);
    }

    const distributorId = item.cart.distributor.id;
    await this.cartItemRepository.deleteById(item.id);

    const cart = await this.cartRepository.findActiveByUserAndDistributor(userId, distributorId);
    if (cart) {
      await this.refreshCartSummary(cart);
    }

    return await this.getCart(userId, distributorId);
  }

  async clearCart(
    userId: string | number,
    distributorId: string | number
  ): Promise<CartResponseDto> {
    const cart = await this.cartRepository.findActiveByUserAndDistributor(userId, distributorId);

    if (!cart) {
      return this.emptyCartResponse(userId, distributorId);
    }

    await this.cartRepository.updateById(cart.id, {
      is_active: false,
      totalQuantity: 0,
      totalAmount: 0,
      discountAmount: 0,
      gstAmount: 0,
      totalPayable: 0,
    } as Partial<Cart>);

    return await this.emptyCartResponse(userId, distributorId);
  }

  private async refreshCartSummary(cart: Cart, queryRunner?: QueryRunner): Promise<void> {
    const summary = CartCalculationHelper.calculateSummary(cart.items || []);
    const summaryUpdate = {
      totalQuantity: summary.totalQuantity,
      totalAmount: summary.totalAmount,
      discountAmount: summary.discountAmount,
      gstAmount: summary.gstAmount,
      totalPayable: summary.totalPayable,
    } as Partial<Cart>;

    if (queryRunner) {
      await queryRunner.manager.update(Cart, { id: cart.id }, summaryUpdate);
      return;
    }

    await this.cartRepository.updateById(cart.id, summaryUpdate);
  }

  private resolveCartonQuantity(current: number, requested?: number | '+' | '-'): number {
    if (requested === undefined) {
      return current;
    }

    if (requested === '+') {
      return current + 1;
    }

    if (requested === '-') {
      return Math.max(1, current - 1);
    }

    if (!Number.isInteger(requested) || requested < 1) {
      throw new BusinessException(ERROR_CODES.CART.INVALID_CARTON_QUANTITY);
    }

    return requested;
  }

  private getProductOrThrow(productId: number): ProductMock {
    const product = (products as ProductMock[]).find((item) => item.id === Number(productId));

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  private validateVariant(product: ProductMock, dto: CreateCartDto): void {
    const hasColor = product.colors.some(
      (color) => color.name.toLowerCase() === dto.color.toLowerCase() || color.code === dto.color
    );

    const size = product.sizes.find((item) => item.size === dto.size);

    if (!hasColor || !size?.isAvailable) {
      throw new BusinessException(ERROR_CODES.CART.INVALID_CART_ITEM);
    }

    // cartonSize 1 = loose pair order, not tied to a defined carton tier
    if (Number(dto.cartonSize) === 1) {
      return;
    }

    const carton = product.cartons.find((item) => Number(item.articles) === Number(dto.cartonSize));

    if (!carton || !carton.sizes.includes(dto.size)) {
      throw new BusinessException(ERROR_CODES.CART.INVALID_CART_ITEM);
    }
  }

  private toResponse(cart: Cart): CartResponseDto {
    const items = cart.items || [];
    const summary = CartCalculationHelper.calculateSummary(items);

    return {
      id: cart.id?.toString(),
      userId: cart.user.id?.toString(),
      distributorId: cart.distributor.id?.toString(),
      items: items.map((item) => this.toItemResponse(item)),
      summary: {
        totalQuantity: summary.totalQuantity,
        totalAmount: CartCalculationHelper.toMoney(summary.totalAmount),
        discountAmount: CartCalculationHelper.toMoney(summary.discountAmount),
        gstAmount: CartCalculationHelper.toMoney(summary.gstAmount),
        totalPayable: CartCalculationHelper.toMoney(summary.totalPayable),
      },
    };
  }

  private toItemResponse(item: CartItem): CartItemResponseDto {
    const product = (products as ProductMock[]).find(
      (productItem) => productItem.id === item.productId
    );

    return {
      id: item.id?.toString(),
      productId: item.productId?.toString(),
      categoryId: item.categoryId?.toString(),
      subCategoryId: item.subCategoryId?.toString(),
      name: product?.name || '',
      thumbnail: product?.thumbnail || '',
      color: item.color,
      size: item.size,
      cartonSize: item.cartonSize,
      cartonQuantity: item.cartonQuantity,
      totalArticles: item.totalArticles,
      unitPrice: CartCalculationHelper.toMoney(item.unitPrice),
      mrp: CartCalculationHelper.toMoney(item.mrp),
      discount: CartCalculationHelper.toMoney(item.discount),
      totalAmount: CartCalculationHelper.toMoney(item.totalAmount),
      isSelected: item.isSelected,
    };
  }

  private emptyCartResponse(
    userId: string | number,
    distributorId?: string | number
  ): CartResponseDto {
    return {
      id: '',
      userId: userId?.toString(),
      distributorId: distributorId?.toString() || '',
      items: [],
      summary: {
        totalQuantity: 0,
        totalAmount: '0.00',
        discountAmount: '0.00',
        gstAmount: '0.00',
        totalPayable: '0.00',
      },
    };
  }
}
