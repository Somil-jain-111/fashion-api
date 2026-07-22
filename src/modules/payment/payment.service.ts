import { Injectable } from '@nestjs/common';
import { PayoutRepository } from './repository/payout.repository';
import { UserRepository } from 'src/modules/user/repository';
import { BeneficiaryRepository, KycVerificationRepository } from 'src/modules/kyc/repository';
import { PointHistoryRepository } from 'src/modules/redemptions/repository';
import { DynamicConfigRepository } from 'src/modules/dynamic-config/repository';
import { TransactionService } from 'src/default/databases/transaction';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { AppConfigService } from 'src/default/config/config.service';
import { KycService } from 'src/modules/kyc/kyc.service';
import { RewardsService } from 'src/modules/rewards/rewards.service';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { Payout, PayoutStatus } from './entities/payout.entity';
import { DateHelper } from 'src/default/common/helper/date.helper';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { GetPaymentsQueryDto } from './dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@Injectable()
export class PaymentService {
  constructor(
    private readonly payoutRepository: PayoutRepository,
    private readonly beneficiaryRepository: BeneficiaryRepository,
    private readonly userRepository: UserRepository,
    private readonly kycVerificationRepository: KycVerificationRepository,
    private readonly pointHistoryRepository: PointHistoryRepository,
    private readonly dynamicConfigRepository: DynamicConfigRepository,
    private readonly transactionUtils: TransactionService,
    private readonly redisService: RedisService,
    private readonly appConfigService: AppConfigService,
    private readonly kycService: KycService,
    private readonly rewardsService: RewardsService
  ) {}

  /**
   * Places a DBT order
   *
   * @param userId
   * @param amount
   * @param points
   * @returns
   */
  async payoutTransaction(userId: number, amount: number, points: number, beneId: number) {
    const lockKey = `user-payout-lock:${userId}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    let redisLockAcquired = false;

    try {
      // Redis lock to prevent double-clicking
      const result = await this.redisService.client.set(lockKey, lockValue, 'EX', 600, 'NX');

      if (!result) {
        throw new BusinessException(ERROR_CODES.PAYMENT.TRANSACTION_IN_PROGRESS);
      }

      redisLockAcquired = true;

      const user = await this.userRepository.findOne(
        {
          id: userId,
          active: true,
        },
        ['role']
      );

      if (!user) {
        throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
      }

      // Check role config for redemption
      const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);

      if (!config || !config.redemptionEnabled || !config.dbtEnabled) {
        throw new BusinessException(ERROR_CODES.PAYMENT.BANK_PAYOUTS_DISABLED);
      }

      // Fetch user's active bank account
      const bankAccount = await this.beneficiaryRepository.findBankAccountByBeneId(userId, beneId);

      if (!bankAccount || bankAccount.status !== 1) {
        throw new BusinessException(ERROR_CODES.PAYMENT.BANK_DETAILS_NOT_VERIFIED);
      }

      const availablePoints = Number(user.points);

      // Available points check
      if (points > availablePoints) {
        throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
      }

      // Check daily count and sum of limits
      const { transactionCount, totalPoints: currentDayTotalPoints } =
        await this.pointHistoryRepository.transactionPerDay(user.id);

      const maxDailyRedemptions =
        config.additionalSettings?.maxDailyRedemptions?.dbt !== undefined &&
        Number(config.additionalSettings?.maxDailyRedemptions?.dbt) > 0
          ? Number(config.additionalSettings?.maxDailyRedemptions?.dbt)
          : 2;

      if (transactionCount >= maxDailyRedemptions) {
        throw new BusinessException(ERROR_CODES.PAYMENT.DAILY_TRANSACTION_LIMIT_REACHED, {
          maxDailyRedemptions,
        });
      }

      const redeemReqPoints = Number(points);
      const totalPoints = redeemReqPoints + Number(currentDayTotalPoints);

      const dailyLimit =
        config.redemptionLimits?.dbt?.daily !== undefined
          ? Number(config.redemptionLimits?.dbt?.daily)
          : 33000;

      if (Number(currentDayTotalPoints) >= dailyLimit) {
        throw new BusinessException(ERROR_CODES.PAYMENT.DAILY_POINT_LIMIT_REACHED, {
          dailyLimit: dailyLimit.toLocaleString(),
        });
      }

      if (totalPoints > dailyLimit) {
        const remainingPoints = dailyLimit - Number(currentDayTotalPoints);
        throw new BusinessException(ERROR_CODES.PAYMENT.DAILY_REMAINING_POINT_LIMIT, {
          remainingPoints: remainingPoints.toLocaleString(),
        });
      }

      // Monthly limit check
      const currentMonthtotalPoints = Number(
        await this.pointHistoryRepository.transactionMonthlyPoints(user.id)
      );

      const monthlyLimit =
        config.redemptionLimits?.dbt?.monthly !== undefined
          ? Number(config.redemptionLimits?.dbt?.monthly)
          : 99000;

      const totalMonthlyPoints = redeemReqPoints + currentMonthtotalPoints;

      if (currentMonthtotalPoints >= monthlyLimit) {
        throw new BusinessException(ERROR_CODES.PAYMENT.MONTHLY_POINT_LIMIT_REACHED, {
          monthlyLimit: monthlyLimit.toLocaleString(),
        });
      }

      if (totalMonthlyPoints > monthlyLimit) {
        const remainingPoints = monthlyLimit - currentMonthtotalPoints;
        throw new BusinessException(ERROR_CODES.PAYMENT.MONTHLY_REMAINING_POINT_LIMIT, {
          remainingPoints: remainingPoints.toLocaleString(),
        });
      }

      // PAN check for high limits
      const totalPointsUsed = await this.pointHistoryRepository.getTotalPointsForPanCheck(userId);
      const currentRedemptionPoints = Number(totalPointsUsed) + points;

      if (points > 59400 || currentRedemptionPoints > 59400) {
        const panKyc = await this.kycVerificationRepository.findOne({
          user: { id: userId },
          type: KycType.PAN,
        });

        if (!panKyc || panKyc.status !== KycStatus.VERIFIED) {
          if (panKyc && panKyc.status === KycStatus.PENDING) {
            throw new BusinessException(ERROR_CODES.KYC.PAN_KYC_PENDING);
          }
          throw new BusinessException(ERROR_CODES.KYC.PAN_KYC_REQUIRED_TO_REDEEM);
        }
      }

      const transactionResult = await this.transactionUtils.runInTransaction(
        async (queryRunner) => {
          const isLive = this.appConfigService.isProduction() || this.appConfigService.isQa();

          const transaction_id = await CommonUtils.generateUniqueRefCode();

          const plainOtp = isLive
            ? Math.floor(1000 + Math.random() * 9000).toString()
            : this.appConfigService.getNonProdRewardsOtp();

          const otpEncrypted = CommonUtils.encrypt(String(plainOtp));
          const otpExpiry = DateHelper.getOtpExpiryDate();

          if (isLive) {
            const sms = await CommonUtils.sendSMS({
              mobile: user.mobile,
              otp: plainOtp,
            });

            ConsoleLogger.log('OTP sent successfully for DBT.', {
              tag: 'PaymentService.payoutTransaction',
              data: sms,
            });
          }

          await this.payoutRepository.save(
            {
              transaction_id,
              points: points,
              amount: amount,
              status: PayoutStatus.INITIATED,
              otp: otpEncrypted,
              otp_verified: 0,
              otp_expiry: otpExpiry,
              user: user,
              userBeneficiary: { id: bankAccount.id } as any,
              account_number: bankAccount.accountNumber,
              ifsc_code: bankAccount.ifsc,
              bank_name: bankAccount.bankName,
            },
            queryRunner
          );

          return { transaction_id };
        }
      );

      return {
        success: true,
        requiresOtp: true,
        transaction_id: transactionResult.transaction_id,
        message: 'OTP sent successfully',
      };
    } catch (error) {
      ConsoleLogger.error(`Payout failed for user ${userId}`, error?.stack, 'PaymentService');
      throw error;
    } finally {
      if (redisLockAcquired) {
        const currentValue = await this.redisService.client.get(lockKey);
        if (currentValue === lockValue) {
          await this.redisService.delete(lockKey);
        }
      }
    }
  }

  /**
   * Resends or generates new OTP for a DBT transaction
   *
   * @param userId
   * @param transactionId
   * @returns
   */
  async resetPayoutOtp(userId: number, transactionId: string) {
    const payout = await this.payoutRepository.findLatestByTransactionId(
      transactionId,
      Number(userId),
      ['user']
    );

    if (!payout) {
      throw new BusinessException(ERROR_CODES.PAYMENT.TRANSACTION_NOT_FOUND);
    }

    if (payout.status !== PayoutStatus.INITIATED) {
      throw new BusinessException(ERROR_CODES.PAYMENT.TRANSACTION_ALREADY_PROCESSED);
    }

    const user = payout.user;
    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const isLive = this.appConfigService.isProduction() || this.appConfigService.isQa();
    let plainOtp: string;

    const expired = DateHelper.isOtpExpired(payout.otp_expiry);

    if (!expired && payout.otp) {
      try {
        plainOtp = CommonUtils.decrypt(payout.otp);
      } catch (e) {
        plainOtp = isLive
          ? Math.floor(1000 + Math.random() * 9000).toString()
          : this.appConfigService.getNonProdRewardsOtp()?.toString() || '9988';

        payout.otp = CommonUtils.encrypt(String(plainOtp));
        payout.otp_expiry = DateHelper.getOtpExpiryDate();

        await this.payoutRepository.save(payout);
      }
    } else {
      plainOtp = isLive
        ? Math.floor(1000 + Math.random() * 9000).toString()
        : this.appConfigService.getNonProdRewardsOtp()?.toString() || '9988';

      const otpEncrypted = CommonUtils.encrypt(String(plainOtp));

      payout.otp = otpEncrypted;
      payout.otp_expiry = DateHelper.getOtpExpiryDate();

      await this.payoutRepository.save(payout);
    }

    if (isLive) {
      const sms = await CommonUtils.sendSMS({
        mobile: user.mobile,
        otp: plainOtp,
      });

      ConsoleLogger.log('OTP sent successfully for DBT reset.', {
        tag: 'PaymentService.resetPayoutOtp',
        data: sms,
      });
    }

    return {
      success: true,
      requiresOtp: true,
      transaction_id: payout.transaction_id,
      message: 'OTP sent successfully',
    };
  }

  /**
   * Verifies a DBT Order
   *
   * @param userId
   * @param transactionId
   * @param otp
   * @returns
   */
  async verifyPayoutOtp(userId: number, transactionId: string, otp: string) {
    const payout = await this.payoutRepository.findLatestByTransactionId(
      transactionId,
      Number(userId),
      ['user', 'user.role', 'userBeneficiary']
    );

    if (!payout) {
      throw new BusinessException(ERROR_CODES.PAYMENT.TRANSACTION_NOT_FOUND);
    }

    const config = await this.dynamicConfigRepository.getUserConfigByUserRole(
      payout.user.role.name
    );

    if (!config || !config.redemptionEnabled || !config.dbtEnabled) {
      throw new BusinessException(ERROR_CODES.PAYMENT.PAYOUTS_DISABLED);
    }

    if (payout.status !== PayoutStatus.INITIATED) {
      throw new BusinessException(ERROR_CODES.PAYMENT.TRANSACTION_ALREADY_PROCESSED);
    }

    if (!payout.otp) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_NOT_FOUND);
    }

    // Deduct points from user
    const user = await this.userRepository.findOne({ id: userId }, ['role']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    // OTP validation
    const isProduction = this.appConfigService.isProduction() || this.appConfigService.isQa();
    const defaultOtp = this.appConfigService.getNonProdRewardsOtp()?.toString() || '9988';
    const encryptedOtp = CommonUtils.encrypt(String(otp));

    if (isProduction) {
      if (payout.otp !== encryptedOtp) {
        throw new BusinessException(ERROR_CODES.OTP.INVALID_OTP);
      }
    } else {
      if (otp !== defaultOtp && payout.otp !== encryptedOtp) {
        throw new BusinessException(ERROR_CODES.OTP.INVALID_OTP);
      }
    }

    if (DateHelper.isOtpExpired(payout.otp_expiry)) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_EXPIRED);
    }

    const bankAccount = payout.userBeneficiary;

    if (!bankAccount) {
      throw new BusinessException(ERROR_CODES.PAYMENT.BANK_ACCOUNT_NOT_FOUND);
    }

    const finalAmountToSend = isProduction ? payout.amount : 1;

    try {
      const transactionResult = await this.transactionUtils.runInTransaction(
        async (queryRunner) => {
          payout.otp_verified = 1;
          payout.otp = null;
          payout.otp_expiry = null;

          const remainingPoints = Number(user.points) - payout.points;

          if (remainingPoints < 0) {
            throw new BusinessException(ERROR_CODES.REWARDS.INSUFFICIENT_POINTS);
          }

          user.points = BigInt(remainingPoints);
          await this.userRepository.save(user, queryRunner);

          // Point History entry
          const savedPointHistory = await this.pointHistoryRepository.save(
            {
              user: { id: payout.user.id } as any,
              description: `DBT Amount: ${payout.amount}`,
              date: new Date(),
              status: PointStatusEnum.redeem,
              type: RedemptionType.BANK,
              transaction_id: payout.transaction_id,
              points: payout.points,
              user_remaining_points: remainingPoints,
              payout: payout,
            },
            queryRunner
          );

          payout.status = PayoutStatus.SUCCESS;
          payout.redeem_date = new Date().toISOString().split('T')[0];
          payout.pointHistory = savedPointHistory;

          await this.payoutRepository.save(payout, queryRunner);

          return {
            success: true,
            amount: finalAmountToSend,
          };
        }
      );

      // Call API placement only if database transaction commits
      const decryptedAccount = await this.kycService.decryptKycData(bankAccount.accountNumber);
      const decryptedIfsc = await this.kycService.decryptKycData(bankAccount.ifsc);

      // Need to seperate this for UPI and BANK
      await this.rewardsService.payoutAmountBank({
        type: 'bank',
        name: bankAccount.bankHolderName,
        number: String(payout.user.mobile),
        account_number: decryptedAccount,
        ifsc: decryptedIfsc,
        transactionId: payout.transaction_id,
        userId,
        amount: transactionResult.amount,
      });

      return {
        success: true,
        message: `₹${payout.amount} will be credited to your bank account`,
      };
    } catch (error) {
      ConsoleLogger.error(
        `OTP verification failed for user ${userId}`,
        error?.stack,
        'PaymentService'
      );
      throw error;
    }
  }

  /**
   * Fetches all the Payments/ Specific payment of user
   *
   * @param userId
   * @param query
   * @returns
   */
  async fetchAllPayments(
    userId: number,
    query: GetPaymentsQueryDto
  ): Promise<{ data: Payout[] | []; pagination: Record<string, any> }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const qb = this.payoutRepository
      .createQueryBuilder('p')
      .where('p.active = :active', { active: true })
      .andWhere('p.user.id = :userId', {
        userId,
      });

    if (query.transactionId) {
      qb.andWhere('p.transaction_id = :transaction_id', { transaction_id: query.transactionId });
    }

    qb.skip(offset);
    qb.take(limit);

    const [result, total] = await qb.getManyAndCount();

    const finalResponse = result?.map((item) => {
      delete item.otp;
      delete item.otp_expiry;
      delete item.otp_verified;

      return item;
    });

    return {
      data: finalResponse,
      pagination: CommonUtils.generatePaginationResponse(total, page, limit),
    };
  }
}
