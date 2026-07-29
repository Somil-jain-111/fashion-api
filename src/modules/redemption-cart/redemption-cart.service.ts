import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import { ERROR_CODES } from 'src/default/error/error.code';
import { BusinessException } from 'src/default/error/business.exception';
import { PointHistoryCalculationStrategy } from 'src/default/common/stratagy/tds.stratagy.interface';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { KycVerificationRepository } from 'src/modules/kyc/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { RewardsService } from '../rewards/rewards.service';
import { RedemptionsService } from '../redemptions/redemptions.service';
import { PlaceCartOrderDto } from '../redemptions/dto/place-cart-order.dto';
import { VerifyOrderDto } from '../redemptions/dto/verify-order.dto';
import {
  RedemptionCartRepository,
  RedemptionCartItemRepository,
} from './repository/redemption-cart.repository';
import { RedemptionCart } from 'src/modules/auth/entities';
import { ManageCartItemDto } from './dto/manage-cart-item.dto';
import { CartItemResponseDto, CartResponseDto } from './dto/cart-response.dto';

@Injectable()
export class RedemptionCartService {
  constructor(
    private readonly redemptionCartRepository: RedemptionCartRepository,
    private readonly redemptionCartItemRepository: RedemptionCartItemRepository,
    private readonly rewardsService: RewardsService,
    // @Inject(forwardRef(() => RedemptionsService))
    private readonly redemptionsService: RedemptionsService,
    private readonly kycVerificationRepository: KycVerificationRepository,
    private readonly userAuthValidator: UserAuthValidator,
    private readonly dataSource: DataSource
  ) {}

  /**
   * @Create Cart / @Get Cart
   *
   * @param userId
   * @returns
   */
  public async getOrCreateActiveCart(
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<RedemptionCart> {
    let cart = await this.redemptionCartRepository.findActiveCartByUser(userId, queryRunner);

    if (!cart) {
      const panKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
        userId,
        KycType.PAN,
        queryRunner
      );

      cart = await this.redemptionCartRepository.save(
        {
          user: { id: userId } as any,
          totalQuantity: 0,
          totalBasePoints: 0,
          tdsPoints: 0,
          tdsPercentage: 0,
          grandTotalPoints: 0,
          isPanVerified: !!panKyc,
          hasPhysicalProduct: false,
          extraInfo: null,
          items: [],
        },
        queryRunner
      );
      cart.items = [];
    }

    return cart;
  }

  /**
   * Recalculate cart totals, TDS, and product flags, and persist to the cart entity
   *
   * @param cart
   * @param userId
   * @param queryRunner
   * @returns
   */
  public async recalculateCart(
    cart: RedemptionCart,
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<RedemptionCart> {
    const items = cart.items || [];

    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalBasePoints = items.reduce(
      (sum, item) => sum + Number(item.pricePoint || 0) * Number(item.quantity || 0),
      0
    );

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

    cart.totalQuantity = totalQuantity;
    cart.totalBasePoints = totalBasePoints;
    cart.tdsPoints = tdsPoints;
    cart.tdsPercentage = tdsPercentage;
    cart.grandTotalPoints = grandTotalPoints;
    cart.isPanVerified = isPanVerified;
    cart.hasPhysicalProduct = hasPhysicalProduct;

    return await this.redemptionCartRepository.save(cart, queryRunner);
  }

  /**
   * @Get Cart Details
   *
   * @param userId
   * @returns
   */
  async getCart(userId: number): Promise<CartResponseDto> {
    const user = await this.userAuthValidator.validateActiveUserById(userId);
    let cart = await this.getOrCreateActiveCart(userId);

    cart = await this.recalculateCart(cart, userId);

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

    const userCurrentPoints = Number(user.points || 0);

    return {
      cartId: String(cart.id),
      totalQuantity: cart.totalQuantity,
      totalBasePoints: cart.totalBasePoints,
      isPanVerified: cart.isPanVerified,
      tdsPercentage: cart.tdsPercentage,
      tdsPoints: cart.tdsPoints,
      grandTotalPoints: cart.grandTotalPoints,
      userCurrentPoints,
      isPointsSufficient: userCurrentPoints >= cart.grandTotalPoints,
      hasPhysicalProduct: cart.hasPhysicalProduct,
      items,
    };
  }

  /**
   * @Add / @Update / @Delete cart item
   *
   * @param userId
   * @param dto
   * @returns
   */
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

  /**
   * @Remove Cart Item
   *
   * @param userId
   * @param itemId
   * @returns
   */
  async removeItem(userId: number, itemId: number | string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateActiveCart(userId);
    const itemToDelete = (cart.items || []).find((item) => String(item.id) === String(itemId));

    if (itemToDelete) {
      await this.redemptionCartItemRepository.deleteById(itemToDelete.id);
    }

    return this.getCart(userId);
  }

  /**
   * Clear all items from a cart and reset calculation fields
   *
   * @param cartId
   * @param queryRunner
   */
  async clearCartItems(cartId: number, queryRunner?: QueryRunner): Promise<void> {
    await this.redemptionCartItemRepository.deleteCartItemsByCartId(cartId, queryRunner);
    await this.redemptionCartRepository.update(
      { id: cartId },
      {
        totalQuantity: 0,
        totalBasePoints: 0,
        tdsPoints: 0,
        tdsPercentage: 0,
        grandTotalPoints: 0,
        hasPhysicalProduct: false,
        extraInfo: null,
      },
      queryRunner
    );
  }

  /**
   * @Clear Cart
   *
   * @param userId
   * @param queryRunner
   * @returns
   */
  async clearCart(userId: number, queryRunner?: QueryRunner): Promise<CartResponseDto> {
    const cart = await this.getOrCreateActiveCart(userId, queryRunner);

    if (cart.items && cart.items.length > 0) {
      await this.clearCartItems(cart.id, queryRunner);
    }

    return this.getCart(userId);
  }

  /**
   * Place order for all items in active cart
   *
   * @param userId
   * @param dto
   * @returns
   */
  async placeCartOrder(userId: number, dto: PlaceCartOrderDto) {
    return this.redemptionsService.placeCartOrder(userId, dto);
  }

  /**
   * Verify OTP for cart order
   *
   * @param userId
   * @param dto
   * @returns
   */
  async verifyCartOrder(userId: number, dto: VerifyOrderDto) {
    return this.redemptionsService.verifyCartOrder(userId, dto);
  }
}
