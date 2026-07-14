import { Injectable } from '@nestjs/common';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { KycVerificationRepository } from 'src/modules/kyc/repository';
import {
  OrderRepository,
  PointHistoryRepository,
  ShippingDetailRepository,
} from 'src/modules/redemptions/repository';
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
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { AppConfigService } from 'src/default/config/config.service';

@Injectable()
export class RedemptionsService {
  constructor(
    private dynamicConfigRepository: DynamicConfigRepository,
    private kycVerificationRepository: KycVerificationRepository,
    private pointHistoryRepository: PointHistoryRepository,
    private addressesService: AddressesService,
    private rewardsService: RewardsService,
    private orderRepository: OrderRepository,
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
   * Create order + Send OTP to User
   *
   * @param userId
   * @param dto
   * @param userRole
   * @returns
   */
  async placeOrder(userId: number, dto: PlaceOrderDto): Promise<PlaceOrderResponseDto> {
    const tag = 'RedemptionService.placeOrder';

    return this.transactionUtils.runInTransaction(async (queryRunner) => {
      ConsoleLogger.log('PLACE_ORDER_START', {
        tag,
        data: { userId, productId: dto.productId },
      });

      /**
       * 1. Validate user
       */
      const user = await this.userAuthValidator.validateActiveUserById(userId);

      /**
       * 2. Validate redemption config
       */
      const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);

      if (!config || !config.redemptionEnabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
      }

      /**
       * 3. Validate KYC
       * At least Aadhaar or PAN should be verified.
       */
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

      const isAadhaarVerified = Boolean(aadhaarKyc);
      const isPanVerified = Boolean(panKyc);

      if (!isPanVerified && !isAadhaarVerified) {
        throw new BusinessException(ERROR_CODES.KYC.KYC_REQUIRED_FOR_REDEMPTION);
      }

      /**
       * 4. Fetch reward product
       */
      const rewardProductResponse = await this.rewardsService.getAllProducts(userId, {
        projectProductId: dto.productId,
        page: 1,
        limit: 1,
      });

      const product = rewardProductResponse?.product?.[0];

      if (!product) {
        throw new BusinessException(ERROR_CODES.REWARDS.PRODUCT_NOT_FOUND);
      }

      const productType = String(product.type || '').toLowerCase();

      const isPhysical = productType === 'physical';
      const isDigital = productType === 'digital';

      /**
       * 5. Validate redemption type config
       */
      if (isPhysical && !config.physicalRedemptionEnabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.PHYSICAL_REDEMPTION_DISABLED);
      }

      if (isDigital && !config.digitalRedemptionEnabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.DIGITAL_REDEMPTION_DISABLED);
      }

      /**
       * 6. Validate address if physical product
       */
      let address: any = null;

      if (isPhysical) {
        if (!dto.addressId) {
          throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_REQUIRED);
        }

        address = await this.addressesService.getAddressById(userId, dto.addressId);

        if (!address) {
          throw new BusinessException(ERROR_CODES.ADDRESS.ADDRESS_NOT_FOUND);
        }
      }

      /**
       * 7. Calculate base points
       */
      const quantity = 1;
      const pricePoints = Number(product.pricePoints || 0);
      const redeemPoints = quantity * pricePoints;

      if (redeemPoints <= 0) {
        throw new BusinessException(ERROR_CODES.REWARDS.INVALID_REWARD_POINTS);
      }

      /**
       * 8. Calculate TDS
       */
      const strategy = new PointHistoryCalculationStrategy(
        user.id,
        BigInt(redeemPoints),
        isPanVerified ? 1 : 0,
        this.dataSource
      );

      const calculation = await strategy.calculatePoints();

      const totalDeduction = Number(calculation.totalDeduction);
      const taxablePoints = Number(calculation.taxablePoints);
      const tdsPoints = Number(calculation.taxAmount);
      const tdsPercentage = Number(calculation.panTax);
      const grandTotalPoints = totalDeduction;

      /**
       * 9. Validate user points after TDS calculation
       */
      if (totalDeduction > Number(user.points || 0)) {
        ConsoleLogger.warn('INSUFFICIENT_POINTS', {
          tag,
          data: {
            userId,
            redeemPoints,
            totalDeduction,
            availablePoints: user.points,
          },
        });

        throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
      }

      /**
       * 10. Decide OTP mobile
       */
      let otpMobile = user.mobile;
      let otpReceiverType = 'USER';

      if (isPhysical && address) {
        if (!address.mobile) {
          throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_MOBILE_REQUIRED);
        }

        otpMobile = address.mobile;
        otpReceiverType = 'SHIPPING';
      }

      if (!otpMobile) {
        throw new BusinessException(ERROR_CODES.USER.MOBILE_NOT_FOUND);
      }

      /**
       * 11. Generate OTP
       */
      const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();
      const otp = isProd
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : this.appConfigService.getNonProdRewardsOtp();
      const otpRefId = await CommonUtils.generateTransactionID();

      const otpExpiryDate = new Date();
      otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 5);

      /**
       * 12. Create order in ORDER_REVIEW status
       */
      const transactionId = await CommonUtils.generateTransactionID();

      const orderEntity = this.orderRepository.create({
        product_id: product.projectProductId,
        order_number: `${user.id}_${Date.now()}`,
        product_name: product.name || product.brand || '',
        product_sku: product.sku || '',
        product_image_url: product.main_image || '',
        short_desc: product.short_description || product.long_description || '',
        rating: '',
        product_remarks: '',

        mrp: Number(product.mrp || 0),
        cost: Number(product.atsCost || 0),
        price_point: Number(product.pricePoints || 0),
        quantity,
        total_points: totalDeduction,
        taxable_points: taxablePoints,
        tds_percentage: tdsPercentage,
        tds_points: tdsPoints,
        grand_total_points: grandTotalPoints,
        user_remaining_points: Number(user.points || 0),
        transaction_id: transactionId,
        order_type: productType,
        status: OrderStatus.ORDER_REVIEW,
        user: { id: user.id } as any,

        redemption_otp: String(otp),
        redemption_otp_ref_id: otpRefId,
        redemption_otp_expired_at: otpExpiryDate,
        redemption_otp_mobile: otpMobile,
        redemption_otp_receiver_type: otpReceiverType,
      });

      const savedOrder = await this.orderRepository.save(orderEntity, queryRunner);
      /**
       * 13. Create shipping details only for physical product
       */
      let shippingDetail: any = null;

      if (isPhysical && address) {
        const shippingObj = this.shippingDetailRepository.create(
          {
            order: { id: savedOrder.id } as any,
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

        shippingDetail = await this.shippingDetailRepository.save(shippingObj, queryRunner);
      }

      /**
       * 14. Send OTP SMS
       */
      // await this.smsService.sendOtp(otpMobile, otp);

      ConsoleLogger.log('PLACE_ORDER_SUCCESS', {
        tag,
        data: {
          userId,
          orderId: savedOrder.id,
          productId: dto.productId,
          redeemPoints,
          tdsPoints,
          totalDeduction,
          orderStatus: OrderStatus.ORDER_REVIEW,
          otpRefId,
          otpMobile,
        },
      });

      return new PlaceOrderResponseDto({
        order: savedOrder,
        shippingDetail,
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

    /**
     * 1. Validate user
     */
    const user = await this.userAuthValidator.validateActiveUserById(userId);

    /**
     * Validate redemption config
     */
    const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);

    if (!config || !config.redemptionEnabled) {
      throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
    }

    /**
     * 2. Validate order
     */
    const order = await this.orderRepository.findOne({
      id: dto.orderId,
      user: { id: userId },
    });

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.ORDER_REVIEW) {
      throw new BusinessException(ERROR_CODES.ORDER.INVALID_ORDER_STATUS);
    }

    if (order.order_type === 'physical' && !config.physicalRedemptionEnabled) {
      throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
    }

    if (order.order_type === 'digital' && !config.digitalRedemptionEnabled) {
      throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
    }

    /**
     * 3. Validate OTP
     */
    await this.redemptionOtpValidator.validate(order, dto.otp);

    /**
     * 4. Validate shipping for physical order
     */
    let shippingDetail: any = null;
    const isPhysical = order.order_type === 'physical';

    if (isPhysical) {
      shippingDetail = await this.shippingDetailRepository.findOne({
        order_id: order.id,
      });

      if (!shippingDetail) {
        throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_DETAIL_NOT_FOUND);
      }

      if (!shippingDetail.mobile) {
        throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_MOBILE_REQUIRED);
      }
    }

    /**
     * 5. Validate points
     */
    const totalDeduction = Number(order.grand_total_points || 0);

    if (totalDeduction <= 0) {
      throw new BusinessException(ERROR_CODES.REWARDS.INVALID_REWARD_POINTS);
    }

    if (totalDeduction > Number(user.points || 0)) {
      throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
    }

    const userRemainingPoints = Number(user.points || 0) - totalDeduction;

    /**
     * 6. Build provider payload
     */
    const providerPayload = this.redemptionProviderPayloadBuilder.build(
      user,
      order,
      shippingDetail
    );

    let providerResponse: any;
    let couponResponse: any;

    try {
      providerResponse = await this.orderPlaceProvider.placeOrder({
        userId: user.id,
        payload: providerPayload,
      });
    } catch (error) {
      if (isPhysical) {
        await this.shippingDetailRepository.update(
          { order_id: order.id },
          {
            delivery_status: ShippingStatus.PROCESSING,
            errorMessage: error?.message || 'Provider API failed',
          }
        );
      }
    }

    /**
     * 7. Transaction before provider call
     */
    await this.transactionUtils.runInTransaction(async (queryRunner: QueryRunner) => {
      /**
       * 8. Update order after provider response
       */
      couponResponse = await this.redemptionProviderResponseHandler.handle(
        {
          user,
          order,
          shippingDetail,
          providerResponse: providerResponse?.responseData,
        },
        queryRunner
      );

      await this.orderRepository.update(
        { id: order.id },
        {
          status: OrderStatus.OTP_VERIFIED,
          user_remaining_points: userRemainingPoints,

          redemption_otp: null,
          redemption_otp_ref_id: null,
          redemption_otp_expired_at: null,
        },
        queryRunner
      );

      const pointHistoryObj = this.pointHistoryRepository.create(
        {
          user: { id: user.id },
          order_id: order.id,
          points: totalDeduction,
          description: 'ORDER PLACED',
          status: PointStatusEnum.redeem,
          date: new Date(),
          user_remaining_points: userRemainingPoints,
          taxable_points: order.taxable_points,
          tds_points: order.tds_points,
        },
        queryRunner
      );

      await this.pointHistoryRepository.save(pointHistoryObj, queryRunner);

      console.log(providerResponse);
    });

    /**
     * 9. Send notification
     */
    // await this.notificationsService.sendNotificationToUser(
    //   user.id,
    //   'PLUMBER_REDEMPTION_SUCCESS',
    //   {
    //     userName: user.username,
    //     productName: order.product_name,
    //     points: order.grand_total_points,
    //   },
    //   {
    //     userName: user.username,
    //     productName: order.product_name,
    //     points: order.grand_total_points,
    //   }
    // );

    ConsoleLogger.log('VERIFY_ORDER_SUCCESS', {
      tag,
      data: {
        userId,
        orderId: order.id,
        providerStatusCode: providerResponse?.statusCode,
      },
    });

    return {
      orderId: order.id,
      orderType: order.order_type,
      status: order.order_type === 'physical' ? ShippingStatus.PLACED : ShippingStatus.DELIVERED,
      message:
        order.order_type === 'physical'
          ? 'Order will arrive in 4 days. You can track it from the order history screen.'
          : 'Your gift card has been delivered instantly and is ready to use.',
      coupon: couponResponse,
    };
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
        { id: query.orderId, user: { id: userId } as any },
        ['shippingDetail', 'voucher']
      );

      if (!order) {
        throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
      }

      return {
        orderId: order.id.toString(),
        orderNumber: order.order_number || null,
        productId: order.product_id,
        productName: order.product_name,
        productSku: order.product_sku || null,
        productImageUrl: order.product_image_url || null,
        orderType: order.order_type,
        quantity: Number(order.quantity),
        mrp: order.mrp.toString(),
        cost: order.cost.toString(),
        pricePoint: order.price_point.toString(),
        totalPoints: Number(order.total_points),
        grandTotalPoints: Number(order.grand_total_points),
        userRemainingPoints: Number(order.user_remaining_points),
        orderStatus: order.status,
        errorMessage: order.errorMessage || null,
        created_at: order.created_at,
        updated_at: order.updated_at,
        shippingDetail: order.shippingDetail
          ? {
              id: order.shippingDetail.id.toString(),
              shipDate: order.shippingDetail.ship_date || null,
              trackingNumber: order.shippingDetail.tracking_number || null,
              trackingUrl: order.shippingDetail.tracking_url || null,
              podLink: order.shippingDetail.pod_link || null,
              deliveryPartner: order.shippingDetail.delivery_partner || null,
              addressLine1: order.shippingDetail.addressLine1,
              addressLine2: order.shippingDetail.addressLine2 || null,
              landmark: order.shippingDetail.landmark || null,
              pincode: order.shippingDetail.pincode,
              cityName: order.shippingDetail.cityName || null,
              stateName: order.shippingDetail.stateName || null,
              zoneName: order.shippingDetail.zoneName || null,
              deliveryStatus: order.shippingDetail.delivery_status,
              mobile: order.shippingDetail.mobile,
            }
          : null,
        voucher: order.voucher
          ? {
              couponCode: order.voucher.coupon_code,
              vPin: order.voucher.v_pin,
              expiryDate: order.voucher.expiry_date,
            }
          : null,
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, count] = await this.orderRepository.getRepository().findAndCount({
      where: { user: { id: userId } as any },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
      relations: ['shippingDetail'],
    });

    const items = orders.map(
      (order) =>
        new OrderSummaryResponseDto({
          order,
          shippingDetail: order.shippingDetail,
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
      id: dto.orderId,
      user: { id: userId } as any,
    });

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.ORDER_REVIEW) {
      throw new BusinessException(ERROR_CODES.ORDER.INVALID_ORDER_STATUS);
    }

    const isExpired =
      !order.redemption_otp_expired_at ||
      new Date(order.redemption_otp_expired_at).getTime() < Date.now();

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
