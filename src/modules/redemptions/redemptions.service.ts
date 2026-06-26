import { Injectable } from '@nestjs/common';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import {
  KycVerificationRepository,
  OrderRepository,
  PointHistoryRepository,
  RedemptionConfigRepository,
  ShippingDetailRepository,
} from 'src/default/common/repositories';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { AddressesService } from '../addresses/addresses.service';
import { RewardsService } from '../rewards/rewards.service';
import { OrderStatus, ShippingStatus } from './enum/order-status.enum';
import { PointHistoryCalculationStrategy } from 'src/default/common/stratagy/tds.stratagy.interface';
import { CreateOrderSummaryDto } from './dto/create-order-summary.dto';
import { OrderSummaryResponseDto } from './dto/order-summary-response.dto';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { TransactionService } from 'src/default/databases/transaction';
import { SendRedemptionOtpDto } from './dto/send-redemption-otp.dto';
import { RedemptionOtpValidator } from './validator/otp-validation.validator';
import { PointStatusEnum } from './enum/point-history-status.enum.';
import { RedemptionProviderResponseHandler } from './handlers/redemption-provider-response.handler';
import { RedemptionProviderPayloadBuilder } from './builders/redemption-provider-payload.builder';
import { OrderPlaceProvider } from './provider/order-place.provider';
import { ConfirmOrderDto } from './dto/confirm-order.dto';

@Injectable()
export class RedemptionsService {
  constructor(
    private redemptionConfigRepository: RedemptionConfigRepository,
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
    private readonly orderPlaceProvider: OrderPlaceProvider
  ) {}

  async createOrderSummary(
    userId: string,
    dto: CreateOrderSummaryDto,
    userRole: UserRole
  ): Promise<OrderSummaryResponseDto> {
    const tag = 'RedemptionService.createOrderSummary';

    return this.transactionUtils.runInTransaction(async (queryRunner) => {
      ConsoleLogger.log('CREATE_ORDER_SUMMARY_START', {
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
      const config = await this.redemptionConfigRepository.findOne({
        user_role: userRole,
      });

      if (!config || !config.redemption_enabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.REDEMPTION_DISABLED);
      }

      /**
       * 3. Validate KYC
       * At least Aadhaar or PAN should be verified.
       */
      const [aadhaarKyc, panKyc] = await Promise.all([
        this.kycVerificationRepository.findOne({
          user_id: userId,
          type: KycType.AADHAAR,
          status: KycStatus.VERIFIED,
        }),
        this.kycVerificationRepository.findOne({
          user_id: userId,
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

      const details = product.productDetails || {};

      const productType = String(details.specification || '').toLowerCase();

      const isPhysical = productType === 'physical';
      const isDigital = productType === 'digital';

      /**
       * 5. Validate redemption type config
       */
      if (isPhysical && !config.physical_redemption_enabled) {
        throw new BusinessException(ERROR_CODES.REWARDS.PHYSICAL_REDEMPTION_DISABLED);
      }

      if (isDigital && !config.digital_redemption_enabled) {
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
      const pricePoints = Number(product.price_points || 0);
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
        isPanVerified ? 1 : 0
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
       * 10. Create order in ORDER_REVIEW status
       */
      const transactionId = await CommonUtils.generateTransactionID();

      const orderEntity = this.orderRepository.create({
        product_id: product.projectProduct_id,
        product_name: details.name || details.brand_name || '',
        product_sku: details.sku || '',
        product_image_url: details.main_image || '',
        short_desc: details.short_description || details.long_description || '',
        rating: details.rating || '',
        product_remarks: details.remarks || '',

        mrp: product.mrp?.toString() || '0',
        cost: product.cost?.toString() || '0',
        price_point: product.price_points?.toString() || '0',
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
      });

      const savedOrder = await queryRunner.manager.save(orderEntity);
      /**
       * 11. Create shipping details only for physical product
       */
      let shippingDetail: any = null;

      if (isPhysical && address) {
        const shippingObj = this.shippingDetailRepository.create({
          order: { id: savedOrder.id } as any,
          addressLine1: address.addressLine1 || address.address || '',
          addressLine2: address.addressLine2 || null,
          landmark: address.landmark || null,
          pincode: address.pincode?.toString() || '',
          cityName: address.cityName || null,
          stateName: address.stateName || null,
          zoneName: address.zoneName || null,
          delivery_status: ShippingStatus.PENDING,
        });

        shippingDetail = await queryRunner.manager.save(shippingObj);
      }

      ConsoleLogger.log('CREATE_ORDER_SUMMARY_SUCCESS', {
        tag,
        data: {
          userId,
          orderId: savedOrder.id,
          productId: dto.productId,
          redeemPoints,
          tdsPoints,
          totalDeduction,
          orderStatus: OrderStatus.ORDER_REVIEW,
        },
      });

      return new OrderSummaryResponseDto({
        order: savedOrder,
        shippingDetail,
      });
    });
  }

  async sendRedemptionOtp(userId: string, dto: SendRedemptionOtpDto) {
    const tag = 'RedemptionsService.sendRedemptionOtp';

    ConsoleLogger.log('SEND_REDEMPTION_OTP_START', {
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
     * 2. Validate order
     */
    const order = await this.orderRepository.findOne({
      id: dto.orderId,
      user_id: userId,
    });

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    /**
     * 3. Allow OTP only for ORDER_REVIEW
     */
    if (order.status !== OrderStatus.ORDER_REVIEW) {
      throw new BusinessException(ERROR_CODES.ORDER.INVALID_ORDER_STATUS);
    }

    /**
     * 4. Decide OTP mobile
     */
    let otpMobile = user.mobile;
    let otpReceiverType = 'USER';

    if (order.order_type === 'physical') {
      const shippingDetail = await this.shippingDetailRepository.findOne({
        order_id: order.id,
      });

      if (!shippingDetail) {
        throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_DETAIL_NOT_FOUND);
      }

      if (!shippingDetail.mobile) {
        throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_MOBILE_REQUIRED);
      }

      otpMobile = shippingDetail.mobile;
      otpReceiverType = 'SHIPPING';
    }

    if (!otpMobile) {
      throw new BusinessException(ERROR_CODES.USER.MOBILE_NOT_FOUND);
    }

    /**
     * 5. Generate OTP
     */
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpRefId = await CommonUtils.generateTransactionID();

    const otpExpiryDate = new Date();
    otpExpiryDate.setMinutes(otpExpiryDate.getMinutes() + 5);

    /**
     * 6. Update OTP in order table
     */
    await this.orderRepository.update(
      { id: order.id },
      {
        redemption_otp: otp,
        redemption_otp_ref_id: otpRefId,
        redemption_otp_expired_at: otpExpiryDate,
        redemption_otp_mobile: otpMobile,
        redemption_otp_receiver_type: otpReceiverType,
      }
    );

    /**
     * 7. Send OTP SMS
     */
    // await this.smsService.sendOtp(otpMobile, otp);

    ConsoleLogger.log('SEND_REDEMPTION_OTP_SUCCESS', {
      tag,
      data: {
        userId,
        orderId: order.id,
        otpRefId,
        otpMobile,
        otpReceiverType,
        otpExpiryDate,
      },
    });

    return {
      orderId: order.id,
      otpRefId,
      mobile: otpMobile,
      receiverType: otpReceiverType,
      expiresIn: 300,
      expiredAt: otpExpiryDate,
    };
  }

  async confirmOrder(userId: string, dto: ConfirmOrderDto) {
    const tag = 'RedemptionsService.confirmOrder';

    ConsoleLogger.log('CONFIRM_ORDER_START', {
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
     * 2. Validate order
     */
    const order = await this.orderRepository.findOne({
      id: dto.orderId,
      user_id: userId,
    });

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.ORDER_REVIEW) {
      throw new BusinessException(ERROR_CODES.ORDER.INVALID_ORDER_STATUS);
    }

    /**
     * 3. Validate OTP
     */
    await this.redemptionOtpValidator.validate(order, dto.otp);

    /**
     * 4. Validate shipping for physical order
     */
    let shippingDetail: any = null;

    if (order.order_type === 'physical') {
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
     * 6. Transaction before provider call
     */
    await this.transactionUtils.execute(async () => {
      await this.orderRepository.update(
        { id: order.id },
        {
          status: OrderStatus.OTP_VERIFIED,
          user_remaining_points: userRemainingPoints,

          redemption_otp: null,
          redemption_otp_ref_id: null,
          redemption_otp_expired_at: null,
        }
      );

      const pointHistoryObj = this.pointHistoryRepository.create({
        user_id: user.id,
        order_id: order.id,
        points: totalDeduction,
        description: 'ORDER PLACED',
        status: PointStatusEnum.redeem,
        date: new Date(),
        user_remaining_points: userRemainingPoints,
        taxable_points: order.taxable_points,
        tds_points: order.tds_points,
      });

      await this.pointHistoryRepository.save(pointHistoryObj);
    });

    /**
     * 7. Build provider payload
     */
    const providerPayload = this.redemptionProviderPayloadBuilder.build(
      user,
      order,
      shippingDetail
    );

    let providerResponse: any;

    try {
      providerResponse = await this.orderPlaceProvider.placeOrder({
        userId: user.id,
        payload: providerPayload,
      });
    } catch (error) {
      await this.shippingDetailRepository.update(
        { order_id: order.id },
        {
          status: ShippingStatus.PROCESSING,
          errorMessage: error?.message || 'Provider API failed',
        }
      );
    }

    /**
     * 9. Update order after provider response
     */
    const couponResponse = await this.redemptionProviderResponseHandler.handle({
      user,
      order,
      shippingDetail,
      providerResponse,
    });

    /**
     * 10. Send notification
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

    ConsoleLogger.log('CONFIRM_ORDER_SUCCESS', {
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
}
