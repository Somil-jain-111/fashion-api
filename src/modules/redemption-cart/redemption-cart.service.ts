import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { PointHistoryCalculationStrategy } from 'src/default/common/stratagy/tds.stratagy.interface';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { KycVerificationRepository } from 'src/modules/kyc/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { RewardsService } from '../rewards/rewards.service';
import {
  RedemptionCartRepository,
  RedemptionCartItemRepository,
} from './repository/redemption-cart.repository';
import {
  RedemptionCart,
  RedemptionCartItem,
  RedemptionCartStatus,
} from 'src/modules/auth/entities';
import { ManageCartItemDto } from './dto/manage-cart-item.dto';
import { CartItemResponseDto, CartResponseDto } from './dto/cart-response.dto';

@Injectable()
export class RedemptionCartService {
  constructor(
    private readonly redemptionCartRepository: RedemptionCartRepository,
    private readonly redemptionCartItemRepository: RedemptionCartItemRepository,
    private readonly rewardsService: RewardsService,
    private readonly kycVerificationRepository: KycVerificationRepository,
    private readonly userAuthValidator: UserAuthValidator,
    private readonly dataSource: DataSource
  ) {}

  public async getOrCreateActiveCart(userId: number): Promise<RedemptionCart> {
    let cart = await this.redemptionCartRepository.findActiveCartByUser(userId);

    if (!cart) {
      cart = await this.redemptionCartRepository.save({
        user: { id: userId } as any,
        status: RedemptionCartStatus.ACTIVE,
        items: [],
      });
      cart.items = [];
    }

    return cart;
  }

  async getCart(userId: number): Promise<CartResponseDto> {
    const user = await this.userAuthValidator.validateActiveUserById(userId);
    const cart = await this.getOrCreateActiveCart(userId);

    const items: CartItemResponseDto[] = (cart.items || []).map((item) => {
      const pricePoint = Number(item.pricePoint || 0);
      const quantity = Number(item.quantity || 0);
      const totalItemPoints = pricePoint * quantity;
      const metadata = item.metadata || {};

      return {
        id: String(item.id),
        productId: item.productId,
        productName: item.productName,
        productType: item.productType || 'digital',
        pricePoint,
        quantity,
        totalItemPoints,
        description: metadata.description || null,
        imageUrl: metadata.imageUrl || null,
        sku: metadata.sku || null,
        mrp: metadata.mrp || null,
        cost: metadata.cost || null,
      };
    });

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalBasePoints = items.reduce((sum, item) => sum + item.totalItemPoints, 0);

    const hasPhysicalProduct = items.some(
      (item) => String(item.productType).toLowerCase() === 'physical'
    );

    // Check PAN KYC for TDS calculation
    const panKyc = await this.kycVerificationRepository.findOne({
      user: { id: userId },
      type: KycType.PAN,
      status: KycStatus.VERIFIED,
    });
    const isPanVerified = Boolean(panKyc);

    let tdsPoints = 0;
    let tdsPercentage = 0;
    let grandTotalPoints = totalBasePoints;

    if (totalBasePoints > 0) {
      const strategy = new PointHistoryCalculationStrategy(
        userId,
        BigInt(totalBasePoints),
        isPanVerified ? 1 : 0,
        this.dataSource
      );
      const calculation = await strategy.calculatePoints();
      grandTotalPoints = Number(calculation.totalDeduction);
      tdsPoints = Number(calculation.taxAmount);
      tdsPercentage = Number(calculation.panTax);
    }

    const userCurrentPoints = Number(user.points || 0);

    return {
      cartId: String(cart.id),
      status: cart.status,
      totalQuantity,
      totalBasePoints,
      isPanVerified,
      tdsPercentage,
      tdsPoints,
      grandTotalPoints,
      userCurrentPoints,
      isPointsSufficient: userCurrentPoints >= grandTotalPoints,
      hasPhysicalProduct,
      items,
    };
  }

  async manageCartItem(userId: number, dto: ManageCartItemDto): Promise<CartResponseDto> {
    await this.userAuthValidator.validateActiveUserById(userId);
    const cart = await this.getOrCreateActiveCart(userId);

    const existingItem = (cart.items || []).find((item) => item.productId === dto.productId);

    if (dto.quantity <= 0) {
      if (existingItem) {
        await this.redemptionCartItemRepository.deleteById(existingItem.id);
      }
      return this.getCart(userId);
    }

    // Fetch product details from RewardsService to ensure catalog validity and get metadata
    const rewardProductResponse = await this.rewardsService.getAllProducts(userId, {
      projectProductId: dto.productId,
      page: 1,
      limit: 1,
    });

    const product = rewardProductResponse?.product?.[0];

    if (!product) {
      throw new BusinessException(ERROR_CODES.REWARDS.PRODUCT_NOT_FOUND);
    }

    const productType = String(product.type || 'digital').toLowerCase();
    const pricePoint = Number(product.pricePoints || 0);
    const productName = product.name || product.brand || 'Reward Product';

    const metadata = {
      description: product.short_description || product.long_description || '',
      imageUrl: product.main_image || '',
      sku: product.sku || '',
      mrp: Number(product.mrp || 0),
      cost: Number(product.atsCost || 0),
    };

    if (existingItem) {
      existingItem.quantity = dto.quantity;
      existingItem.pricePoint = pricePoint;
      existingItem.productName = productName;
      existingItem.productType = productType;
      existingItem.metadata = metadata;
      await this.redemptionCartItemRepository.save(existingItem);
    } else {
      await this.redemptionCartItemRepository.save({
        cart: { id: cart.id } as any,
        productId: dto.productId,
        productName,
        quantity: dto.quantity,
        pricePoint,
        productType,
        metadata,
      });
    }

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number | string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateActiveCart(userId);
    const itemToDelete = (cart.items || []).find((item) => String(item.id) === String(itemId));

    if (itemToDelete) {
      await this.redemptionCartItemRepository.deleteById(itemToDelete.id);
    }

    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<CartResponseDto> {
    const cart = await this.getOrCreateActiveCart(userId);

    if (cart.items && cart.items.length > 0) {
      await this.redemptionCartItemRepository.deleteById(cart.id);
    }

    return this.getCart(userId);
  }
}
