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
import { CreateOrderSummaryDto } from './enum/create-order-summary.dto';
import { OrderSummaryResponseDto } from './enum/order-summary-response.dto';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { TransactionService } from 'src/default/databases/transaction';

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
    private transactionUtils: TransactionService
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
}
