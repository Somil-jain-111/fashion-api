import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { KycVerificationRepository } from 'src/modules/kyc/repository';
import {
  OrderRepository,
  OrderItemRepository,
  PointHistoryRepository,
  ShippingDetailRepository,
} from 'src/modules/redemptions/repository';
import { RedemptionCartService } from '../redemption-cart/redemption-cart.service';
import { DynamicConfigRepository } from 'src/modules/dynamic-config/repository';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { AddressesService } from '../addresses/addresses.service';
import { RewardsService } from '../rewards/rewards.service';
import { OrderStatus, ShippingStatus } from './enum/order-status.enum';
import { PointHistoryCalculationStrategy } from 'src/default/common/stratagy/tds.stratagy.interface';
import { PlaceOrderDto } from './dto/place-order.dto';
import { PlaceCartOrderDto } from './dto/place-cart-order.dto';
import { OrderSummaryResponseDto } from './dto/order-summary-response.dto';
import { PlaceOrderResponseDto } from './dto/place-order-response.dto';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { TransactionService } from 'src/default/databases/transaction';
import { VerifyOrderDto } from './dto/verify-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { RedemptionOtpValidator } from './validator/otp-validation.validator';
import { PointStatusEnum } from './enum/point-history-status.enum.';
import { RedemptionProviderResponseHandler } from './handlers/redemption-provider-response.handler';
import { RedemptionProviderPayloadBuilder } from './builders/redemption-provider-payload.builder';
import { OrderPlaceProvider } from './provider/order-place.provider';
import { DataSource, QueryRunner } from 'typeorm';
import { AppConfigService } from 'src/default/config/config.service';
import { DateHelper } from 'src/default/common/helper/date.helper';
import { ParentOrderType } from './enum/order-type.enum';
import { RedemptionType } from './enum/redemption-type.enum';

@Injectable()
export class RedemptionsService {
  constructor(
    private dynamicConfigRepository: DynamicConfigRepository,
    private kycVerificationRepository: KycVerificationRepository,
    private pointHistoryRepository: PointHistoryRepository,
    private addressesService: AddressesService,
    private rewardsService: RewardsService,
    private orderRepository: OrderRepository,
    private orderItemRepository: OrderItemRepository,
    @Inject(forwardRef(() => RedemptionCartService))
    private redemptionCartService: RedemptionCartService,
    private shippingDetailRepository: ShippingDetailRepository,
    private userAuthValidator: UserAuthValidator,
    private transactionUtils: TransactionService,
    private redemptionOtpValidator: RedemptionOtpValidator,
    private readonly redemptionProviderResponseHandler: RedemptionProviderResponseHandler,
    private readonly redemptionProviderPayloadBuilder: RedemptionProviderPayloadBuilder,
    private readonly orderPlaceProvider: OrderPlaceProvider,
    private readonly dataSource: DataSource,
    private readonly appConfigService: AppConfigService
  ) {}

  /**
   * Create single redemption order + Send OTP to User (No Cart Involvement)
   *
   * @param userId
   * @param dto
   * @returns
   */
  async placeOrder(userId: number, dto: PlaceOrderDto): Promise<PlaceOrderResponseDto> {
    const tag = 'RedemptionService.placeOrder';

    if (!dto.productId) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Product ID is required for placing a single redemption order.',
      });
    }

    return this.transactionUtils.runInTransaction(async (queryRunner) => {
      ConsoleLogger.log('PLACE_ORDER_START', {
        tag,
        data: { userId, productId: dto.productId, addressId: dto.addressId },
      });

      const user = await this.userAuthValidator.validateActiveUserById(userId);

      const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);

      if (!config || !config.redemptionEnabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
      }

      // Validate KYC
      const skipKyc = config.additionalSettings?.skipKyc === true;
      let isPanVerified = false;
      if (!skipKyc) {
        const [aadhaarKyc, panKyc] = await Promise.all([
          this.kycVerificationRepository.findOne({
            user: { id: userId },
            type: KycType.AADHAAR,
            status: KycStatus.VERIFIED,
          }),
          this.kycVerificationRepository.findOne({
            user: { id: userId },
            type: KycType.PAN,
            status: KycStatus.VERIFIED,
          }),
        ]);

        if (!panKyc && !aadhaarKyc) {
          throw new BusinessException(ERROR_CODES.KYC.KYC_REQUIRED_FOR_REDEMPTION);
        }
        isPanVerified = Boolean(panKyc);
      }

      // Verify product catalog directly
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
      let hasPhysicalProduct = false;

      if (productType === 'physical') {
        hasPhysicalProduct = true;
        if (!config.physicalRedemptionEnabled) {
          throw new BusinessException(ERROR_CODES.REWARDS.PHYSICAL_REDEMPTION_DISABLED);
        }
      } else {
        if (!config.digitalRedemptionEnabled) {
          throw new BusinessException(ERROR_CODES.REWARDS.DIGITAL_REDEMPTION_DISABLED);
        }
      }

      const pricePoint = Number(product.pricePoints || 0);
      const totalBasePoints = pricePoint;
      const totalQuantity = 1;

      if (totalBasePoints <= 0) {
        throw new BusinessException(ERROR_CODES.REWARDS.INVALID_REWARD_POINTS);
      }

      let address: any = null;
      if (hasPhysicalProduct) {
        if (!dto.addressId) {
          throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_REQUIRED);
        }

        address = await this.addressesService.getAddressById(userId, dto.addressId);

        if (!address) {
          throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_NOT_FOUND);
        }
      }

      // Calculate TDS
      const strategy = new PointHistoryCalculationStrategy(
        user.id,
        BigInt(totalBasePoints),
        isPanVerified ? 1 : 0,
        this.dataSource
      );
      const calculation = await strategy.calculatePoints();

      const grandTotalPoints = Number(calculation.totalDeduction);
      const taxablePoints = Number(calculation.taxablePoints);
      const tdsPoints = Number(calculation.taxAmount);
      const tdsPercentage = Number(calculation.panTax);

      if (grandTotalPoints > Number(user.points || 0)) {
        throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
      }

      let otpMobile = user.mobile;
      let otpReceiverType = 'USER';

      if (hasPhysicalProduct && address) {
        if (!address.mobile) {
          throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_MOBILE_REQUIRED);
        }
        otpMobile = address.mobile;
        otpReceiverType = 'SHIPPING';
      }

      if (!otpMobile) {
        throw new BusinessException(ERROR_CODES.USER.MOBILE_NOT_FOUND);
      }

      const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();
      const otp = isProd
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : this.appConfigService.getNonProdRewardsOtp();
      const otpRefId = await CommonUtils.generateTransactionID();

      const otpExpiryDate = new Date();
      otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 5);

      const orderType = productType;
      const masterOrderNumber = `ORD_${user.id}_${Date.now()}`;

      const savedOrder = await this.orderRepository.save(
        {
          order_number: masterOrderNumber,
          totalItems: 1,
          total_points: totalBasePoints,
          taxable_points: taxablePoints,
          tds_percentage: tdsPercentage,
          tds_points: tdsPoints,
          grand_total_points: grandTotalPoints,
          user_remaining_points: Number(user.points || 0),
          order_type: ParentOrderType.SINGLE,
          status: OrderStatus.ORDER_REVIEW,
          user: { id: user.id } as any,
          remarks: 'SINGLE_ORDER',

          redemption_otp: String(otp),
          redemption_otp_ref_id: otpRefId,
          redemption_otp_expired_at: otpExpiryDate,
          redemption_otp_mobile: otpMobile,
          redemption_otp_receiver_type: otpReceiverType,
        },
        queryRunner
      );

      // Create Single Child Order Item
      const itemTxnId = CommonUtils.generateTransactionID();

      const savedOrderItem = await this.orderItemRepository.save(
        {
          order: { id: savedOrder.id } as any,
          orderNumber: '',
          productId: dto.productId,
          productName: product.name || product.brand || 'Reward Product',
          productType: productType,
          pricePoint: pricePoint,
          quantity: 1,
          totalPoints: pricePoint,
          productSku: product.sku || null,
          productImageUrl: product.main_image || null,
          shortDesc: product.short_description || product.long_description || null,
          cost: Number(product.atsCost || 0),
          mrp: Number(product.mrp || 0),
          status: OrderStatus.ORDER_REVIEW,
          transactionId: itemTxnId,
        },
        queryRunner
      );

      // Create shipping detail if physical product
      let shippingDetail: any = null;
      if (hasPhysicalProduct && address) {
        shippingDetail = await this.shippingDetailRepository.save(
          {
            orderItem: { id: savedOrderItem.id },
            addressLine1: address.addressLine1 || address.address || '',
            addressLine2: address.addressLine2 || null,
            landmark: address.landmark || null,
            pincode: address.pincode?.toString() || '',
            cityName: address.cityName || null,
            stateName: address.stateName || null,
            zoneName: address.zoneName || null,
            delivery_status: ShippingStatus.PENDING,
            mobile: address.mobile,
          },
          queryRunner
        );
      }

      ConsoleLogger.log('PLACE_ORDER_SUCCESS', {
        tag,
        data: {
          userId,
          orderId: savedOrder.id,
          totalQuantity,
          totalBasePoints,
          grandTotalPoints,
          otpRefId,
          otpMobile,
        },
      });

      return new PlaceOrderResponseDto({
        order: savedOrder,
        // shippingDetail,
        otpDetails: {
          otpRefId,
          mobile: otpMobile,
          receiverType: otpReceiverType,
          expiresIn: 300,
          expiredAt: otpExpiryDate,
        },
      });
    });
  }

  /**
   * Create cart redemption order + Send OTP to User + Clear active cart
   *
   * @param userId
   * @param dto
   * @returns
   */
  async placeCartOrder(userId: number, dto: PlaceCartOrderDto): Promise<PlaceOrderResponseDto> {
    const tag = 'RedemptionService.placeCartOrder';

    return this.transactionUtils.runInTransaction(async (queryRunner) => {
      ConsoleLogger.log('PLACE_CART_ORDER_START', {
        tag,
        data: { userId, addressId: dto.addressId },
      });

      const user = await this.userAuthValidator.validateActiveUserById(userId);

      const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);

      if (!config || !config.redemptionEnabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
      }

      const activeCart = await this.redemptionCartService.getOrCreateActiveCart(
        userId,
        queryRunner
      );

      if (!activeCart.items || activeCart.items.length === 0) {
        throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
          reason: 'Cart is empty. Please add items to your cart before proceeding to checkout.',
        });
      }

      // Validate KYC
      const skipKyc = config.additionalSettings?.skipKyc === true;
      let isPanVerified = false;

      if (!skipKyc) {
        const [aadhaarKyc, panKyc] = await Promise.all([
          this.kycVerificationRepository.findOne({
            user: { id: userId },
            type: KycType.AADHAAR,
            status: KycStatus.VERIFIED,
          }),
          this.kycVerificationRepository.findOne({
            user: { id: userId },
            type: KycType.PAN,
            status: KycStatus.VERIFIED,
          }),
        ]);

        if (!panKyc && !aadhaarKyc) {
          throw new BusinessException(ERROR_CODES.KYC.KYC_REQUIRED_FOR_REDEMPTION);
        }
        isPanVerified = Boolean(panKyc);
      }

      // Re-verify catalog and check item types
      let totalBasePoints = 0;
      let totalQuantity = 0;
      let totalMrp = 0;
      let totalCost = 0;
      let hasPhysicalProduct = false;
      let hasDigitalProduct = false;

      for (const cartItem of activeCart.items) {
        const rewardProductResponse = await this.rewardsService.getAllProducts(userId, {
          projectProductId: cartItem.productId,
          page: 1,
          limit: 1,
        });

        const product = rewardProductResponse?.product?.[0];

        if (!product) {
          throw new BusinessException(ERROR_CODES.REWARDS.PRODUCT_NOT_FOUND);
        }

        const productType = String(product.type || cartItem.productType || 'digital').toLowerCase();
        if (productType === 'physical') {
          hasPhysicalProduct = true;
          if (!config.physicalRedemptionEnabled) {
            throw new BusinessException(ERROR_CODES.REWARDS.PHYSICAL_REDEMPTION_DISABLED);
          }
        } else {
          hasDigitalProduct = true;
          if (!config.digitalRedemptionEnabled) {
            throw new BusinessException(ERROR_CODES.REWARDS.DIGITAL_REDEMPTION_DISABLED);
          }
        }

        const pricePoint = Number(product.pricePoints || cartItem.pricePoint || 0);
        const qty = Number(cartItem.quantity || 1);
        totalBasePoints += pricePoint * qty;
        totalQuantity += qty;
        totalMrp += Number(product.mrp || 0) * qty;
        totalCost += Number(product.atsCost || 0) * qty;
      }

      if (totalBasePoints <= 0) {
        throw new BusinessException(ERROR_CODES.REWARDS.INVALID_REWARD_POINTS);
      }

      let address: any = null;
      if (hasPhysicalProduct) {
        if (!dto.addressId) {
          throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_REQUIRED);
        }

        address = await this.addressesService.getAddressById(userId, dto.addressId);

        if (!address) {
          throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_NOT_FOUND);
        }
      }

      // Calculate TDS
      const strategy = new PointHistoryCalculationStrategy(
        user.id,
        BigInt(totalBasePoints),
        isPanVerified ? 1 : 0,
        this.dataSource
      );
      const calculation = await strategy.calculatePoints();

      const grandTotalPoints = Number(calculation.totalDeduction);
      const taxablePoints = Number(calculation.taxablePoints);
      const tdsPoints = Number(calculation.taxAmount);
      const tdsPercentage = Number(calculation.panTax);

      if (grandTotalPoints > Number(user.points || 0)) {
        throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
      }

      let otpMobile = user.mobile;
      let otpReceiverType = 'USER';

      if (hasPhysicalProduct && address) {
        if (!address.mobile) {
          throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_MOBILE_REQUIRED);
        }
        otpMobile = address.mobile;
        otpReceiverType = 'SHIPPING';
      }

      if (!otpMobile) {
        throw new BusinessException(ERROR_CODES.USER.MOBILE_NOT_FOUND);
      }

      const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();
      const otp = isProd
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : this.appConfigService.getNonProdRewardsOtp();
      const otpRefId = await CommonUtils.generateTransactionID();

      const otpExpiryDate = new Date();
      otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 5);

      const masterOrderNumber = `ORD_${user.id}_${Date.now()}`;

      // Create Parent Order
      const savedOrder = await this.orderRepository.save(
        {
          order_number: masterOrderNumber,
          order_type: ParentOrderType.CART,
          totalItems: totalQuantity,
          total_points: totalBasePoints,
          taxable_points: taxablePoints,
          tds_percentage: tdsPercentage,
          tds_points: tdsPoints,
          grand_total_points: grandTotalPoints,
          user_remaining_points: Number(user.points || 0),
          status: OrderStatus.ORDER_REVIEW,
          user: { id: user.id } as any,
          remarks: 'CART_ORDER',

          redemption_otp: String(otp),
          redemption_otp_ref_id: otpRefId,
          redemption_otp_expired_at: otpExpiryDate,
          redemption_otp_mobile: otpMobile,
          redemption_otp_receiver_type: otpReceiverType,
        },
        queryRunner
      );

      // Create Child Order Items (NOTE: Redemption is always of 1 quantity, so if cart item says quantity 2, create 2 separate child order items)
      let itemSeq = 1;
      for (const cartItem of activeCart.items) {
        const metadata = cartItem.metadata || {};
        const qty = Number(cartItem.quantity || 1);
        const itemProductType = String(cartItem.productType || '').toLowerCase();

        for (let q = 0; q < qty; q++) {
          const itemTxnId = CommonUtils.generateTransactionID();

          const savedOrderItem = await this.orderItemRepository.save(
            {
              order: { id: savedOrder.id } as any,
              orderNumber: '',
              productId: cartItem.productId,
              productName: cartItem.productName,
              productType: cartItem.productType,
              pricePoint: cartItem.pricePoint,
              quantity: 1,
              totalPoints: cartItem.pricePoint,
              productSku: metadata.sku || null,
              productImageUrl: metadata.imageUrl || null,
              shortDesc: metadata.description || null,
              cost: Number(metadata.cost || 0),
              mrp: Number(metadata.mrp || 0),
              status: OrderStatus.ORDER_REVIEW,
              transactionId: itemTxnId,
            },
            queryRunner
          );

          if (itemProductType === 'physical' && address) {
            await this.shippingDetailRepository.save(
              {
                orderItem: { id: savedOrderItem.id } as any,
                addressLine1: address.addressLine1 || address.address || '',
                addressLine2: address.addressLine2 || null,
                landmark: address.landmark || null,
                pincode: address.pincode?.toString() || '',
                cityName: address.cityName || null,
                stateName: address.stateName || null,
                zoneName: address.zoneName || null,
                delivery_status: ShippingStatus.PENDING,
                mobile: address.mobile,
              },
              queryRunner
            );
          }

          itemSeq++;
        }
      }

      // Clean/clear active cart items once verification OTP is created/sent
      await this.redemptionCartService.clearCartItems(activeCart.id, queryRunner);

      ConsoleLogger.log('PLACE_CART_ORDER_SUCCESS', {
        tag,
        data: {
          userId,
          orderId: savedOrder.id,
          totalQuantity,
          totalBasePoints,
          grandTotalPoints,
          otpRefId,
          otpMobile,
        },
      });

      return new PlaceOrderResponseDto({
        order: savedOrder,
        // shippingDetail,
        otpDetails: {
          otpRefId,
          mobile: otpMobile,
          receiverType: otpReceiverType,
          expiresIn: 300,
          expiredAt: otpExpiryDate,
        },
      });
    });
  }

  /**
   * Verify OTP + Place Order
   *
   * @param userId
   * @param dto
   * @returns
   */
  async verifyOrder(userId: number, dto: VerifyOrderDto) {
    const tag = 'RedemptionsService.verifyOrder';

    ConsoleLogger.log('VERIFY_ORDER_START', {
      tag,
      data: {
        userId,
        orderId: dto.orderId,
      },
    });

    const user = await this.userAuthValidator.validateActiveUserById(userId);

    const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);

    if (!config || !config.redemptionEnabled) {
      throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
    }

    const order = await this.orderRepository.findOne(
      {
        id: Number(dto.orderId),
        user: { id: userId },
      },
      ['items', 'items.shippingDetail']
    );

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.ORDER_REVIEW) {
      throw new BusinessException(ERROR_CODES.ORDER.INVALID_ORDER_STATUS);
    }

    await this.redemptionOtpValidator.validate(order, dto.otp);

    const orderItems = order.items || [];
    const grandTotalDeduction = Number(order.grand_total_points || 0);

    if (grandTotalDeduction > Number(user.points || 0)) {
      throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
    }

    const userRemainingPoints = Number(user.points || 0) - grandTotalDeduction;

    const itemResults: any[] = [];
    let successCount = 0;

    for (const item of orderItems) {
      let itemShippingDetail = item.shippingDetail;
      if (!itemShippingDetail && item.productType === 'physical') {
        itemShippingDetail = await this.shippingDetailRepository.findOne({
          orderItem: { id: item.id },
        });
      }
      const providerPayload = this.redemptionProviderPayloadBuilder.build(
        user,
        {
          ...item,
          total_points: item.totalPoints || item.pricePoint,
          quantity: item.quantity || 1,
          transaction_id: item.transactionId,
          product_sku: item.productSku,
          order_type: item.productType,
        },
        itemShippingDetail
      );

      let providerResponse: any = null;
      try {
        providerResponse = await this.orderPlaceProvider.placeOrder({
          userId: user.id,
          payload: providerPayload,
        });
      } catch (err) {
        providerResponse = { statusCode: 500, message: err?.message || 'Provider request failed' };
      }

      await this.transactionUtils.runInTransaction(async (queryRunner: QueryRunner) => {
        const handleRes = await this.redemptionProviderResponseHandler.handle(
          {
            user,
            order: {
              id: item.id,
              order_type: item.productType,
            },
            shippingDetail: itemShippingDetail,
            providerResponse: providerResponse?.responseData || providerResponse,
          },
          queryRunner
        );

        const isSuccess =
          providerResponse?.statusCode === 200 ||
          providerResponse?.responseData?.statusCode === 200;

        if (isSuccess) {
          successCount++;
        }

        const rewardsOrderNumber =
          providerResponse?.responseData?.data?.order_number ||
          providerResponse?.data?.order_number ||
          null;

        const itemRepo = queryRunner.manager.getRepository('order_items');
        await itemRepo.update(
          { id: item.id },
          {
            orderNumber: rewardsOrderNumber || item.transactionId,
            status: isSuccess ? OrderStatus.PLACED : OrderStatus.FAILED,
            ...(isSuccess
              ? {}
              : {
                  errorMessage:
                    providerResponse?.message ||
                    providerResponse?.responseData?.message ||
                    'Provider request failed',
                }),
          }
        );

        itemResults.push({
          orderItemId: item.id,
          orderNumber: rewardsOrderNumber || item.transactionId,
          productId: item.productId,
          productName: item.productName,
          status: isSuccess ? OrderStatus.PLACED : OrderStatus.FAILED,
          transactionId: item.transactionId,
          voucher: handleRes || null,
          errorMessage: !isSuccess
            ? providerResponse?.message ||
              providerResponse?.responseData?.message ||
              'Provider request failed'
            : null,
        });
      });
    }

    const finalStatus =
      successCount === orderItems.length
        ? OrderStatus.PLACED
        : successCount > 0
          ? OrderStatus.PARTIAL
          : OrderStatus.FAILED;

    await this.transactionUtils.runInTransaction(async (queryRunner: QueryRunner) => {
      // Update master order status
      await this.orderRepository.update(
        { id: order.id },
        {
          status: finalStatus,
          user_remaining_points: userRemainingPoints,
          redemption_otp: null,
          redemption_otp_ref_id: null,
          redemption_otp_expired_at: null,
        },
        queryRunner
      );

      // Deduct points & write history
      if (finalStatus !== OrderStatus.FAILED) {
        const userRepo = queryRunner.manager.getRepository('users');
        await userRepo.update({ id: user.id }, { points: BigInt(userRemainingPoints) });

        await this.pointHistoryRepository.save(
          {
            user: { id: user.id },
            order: { id: order.id },
            points: grandTotalDeduction,
            type: RedemptionType.REDEMPTION,
            description: 'ORDER PLACED',
            status: PointStatusEnum.redeem,
            date: new Date(),
            user_remaining_points: userRemainingPoints,
            taxable_points: order.taxable_points,
            tds_points: order.tds_points,
          },
          queryRunner
        );
      }
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: finalStatus,
      totalQuantity: order.totalItems,
      grandTotalPoints: grandTotalDeduction,
      userRemainingPoints,
      items: itemResults,
    };
  }

  /**
   * Verify OTP + Place Cart Order (places each child order item to provider)
   *
   * @param userId
   * @param dto
   * @returns
   */
  async verifyCartOrder(userId: number, dto: VerifyOrderDto) {
    const tag = 'RedemptionsService.verifyCartOrder';

    ConsoleLogger.log('VERIFY_CART_ORDER_START', {
      tag,
      data: {
        userId,
        orderId: dto.orderId,
      },
    });

    return this.verifyOrder(userId, dto);
  }

  /**
   * Get all/Specific redemptions of a user
   *
   * @param userId
   * @param query
   * @returns
   */
  async getOrders(userId: number, query: GetOrdersQueryDto) {
    const tag = 'RedemptionsService.getOrders';

    ConsoleLogger.log('GET_ORDERS_START', {
      tag,
      data: { userId, query },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    if (query.orderId) {
      const order = await this.orderRepository.findOne(
        { id: Number(query.orderId), user: { id: userId } as any },
        ['items', 'items.shippingDetail', 'items.voucher']
      );

      if (!order) {
        throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
      }

      return {
        orderId: order.id.toString(),
        orderNumber: order.order_number || null,
        orderType: order.order_type,
        totalItems: Number(order.totalItems || 0),
        totalPoints: Number(order.total_points),
        taxablePoints: Number(order.taxable_points),
        tdsPercentage: Number(order.tds_percentage),
        tdsPoints: Number(order.tds_points),
        grandTotalPoints: Number(order.grand_total_points),
        userRemainingPoints: Number(order.user_remaining_points),
        orderStatus: order.status,
        errorMessage: order.errorMessage || null,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        items: (order.items || []).map((item) => ({
          orderItemId: item.id.toString(),
          orderNumber: item.orderNumber || null,
          productId: item.productId,
          productName: item.productName,
          productType: item.productType,
          productSku: item.productSku || null,
          productImageUrl: item.productImageUrl || null,
          shortDesc: item.shortDesc || null,
          pricePoint: Number(item.pricePoint),
          quantity: Number(item.quantity),
          totalPoints: Number(item.totalPoints),
          cost: Number(item.cost),
          mrp: Number(item.mrp),
          status: item.status,
          errorMessage: item.errorMessage || null,
          shippingDetail: item.shippingDetail
            ? {
                id: item.shippingDetail.id.toString(),
                shipDate: item.shippingDetail.ship_date || null,
                trackingNumber: item.shippingDetail.tracking_number || null,
                trackingUrl: item.shippingDetail.tracking_url || null,
                podLink: item.shippingDetail.pod_link || null,
                deliveryPartner: item.shippingDetail.delivery_partner || null,
                addressLine1: item.shippingDetail.addressLine1,
                addressLine2: item.shippingDetail.addressLine2 || null,
                landmark: item.shippingDetail.landmark || null,
                pincode: item.shippingDetail.pincode,
                cityName: item.shippingDetail.cityName || null,
                stateName: item.shippingDetail.stateName || null,
                zoneName: item.shippingDetail.zoneName || null,
                deliveryStatus: item.shippingDetail.delivery_status,
                mobile: item.shippingDetail.mobile,
              }
            : null,
          voucher: item.voucher
            ? {
                couponCode: item.voucher.coupon_code,
                vPin: item.voucher.v_pin,
                expiryDate: item.voucher.expiry_date,
              }
            : null,
        })),
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, count] = await this.orderRepository.getRepository().findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['items', 'items.shippingDetail'],
    });

    const items = orders.map(
      (order) =>
        new OrderSummaryResponseDto({
          order,
        })
    );

    return {
      orders: items,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  /**
   * Resend OTP if expired
   *
   * @param userId
   * @param dto
   * @returns
   */
  async resendOtp(userId: number, dto: ResendOtpDto) {
    const tag = 'RedemptionsService.resendOtp';

    ConsoleLogger.log('RESEND_OTP_START', {
      tag,
      data: { userId, orderId: dto.orderId },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    const order = await this.orderRepository.findOne({
      id: Number(dto.orderId),
      user: { id: userId } as any,
    });

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.ORDER_REVIEW) {
      throw new BusinessException(ERROR_CODES.ORDER.INVALID_ORDER_STATUS);
    }

    const isExpired = DateHelper.isOtpExpired(order.redemption_otp_expired_at);

    let otp = order.redemption_otp;
    let otpRefId = order.redemption_otp_ref_id;
    let otpExpiryDate = order.redemption_otp_expired_at;

    if (isExpired) {
      const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();
      otp = isProd
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : this.appConfigService.getNonProdRewardsOtp().toString();
      otpRefId = await CommonUtils.generateTransactionID();

      otpExpiryDate = new Date();
      otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 5);

      await this.orderRepository.update(
        { id: order.id },
        {
          redemption_otp: otp,
          redemption_otp_ref_id: otpRefId,
          redemption_otp_expired_at: otpExpiryDate,
        }
      );

      ConsoleLogger.log('RESEND_OTP_GENERATED_NEW', {
        tag,
        data: {
          orderId: order.id,
          otpRefId,
          mobile: order.redemption_otp_mobile,
        },
      });
    } else {
      ConsoleLogger.log('RESEND_OTP_USING_EXISTING', {
        tag,
        data: {
          orderId: order.id,
          otpRefId,
          mobile: order.redemption_otp_mobile,
        },
      });
    }

    // await this.smsService.sendOtp(order.redemption_otp_mobile, otp);

    const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();
    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(otpExpiryDate).getTime() - Date.now()) / 1000)
    );

    return {
      otpDetails: {
        otpRefId,
        mobile: order.redemption_otp_mobile,
        receiverType: order.redemption_otp_receiver_type,
        expiresIn: remainingSeconds,
        expiredAt: otpExpiryDate,
        ...(isProd ? {} : { otp }),
      },
    };
  }
}
