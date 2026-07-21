import { Injectable, BadRequestException } from '@nestjs/common';
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
import { PayoutStatus } from './entities/payout.entity';

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
        throw new BadRequestException('A transaction is already in progress. Please wait.');
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
        throw new BadRequestException('User not found');
      }

      // Check role config for redemption
      const config = await this.dynamicConfigRepository.getUserConfigByUserRole(user.role.name);
      if (!config || !config.redemptionEnabled || !config.dbtEnabled) {
        throw new BadRequestException(
          'Bank payouts (DBT) are currently disabled for your user role.'
        );
      }

      // Fetch user's active bank account
      const bankAccount = await this.beneficiaryRepository.findBankAccountByBeneId(userId, beneId);

      if (!bankAccount || bankAccount.status !== 1) {
        throw new BadRequestException(
          'Bank KYC / Bank Account details are not completed or verified.'
        );
      }

      const availablePoints = Number(user.points);

      // Capping limits check
      if (config.additionalSettings?.cappingLimitEnabled) {
        const cappingLimit = Math.floor(
          (config.additionalSettings?.cappingLimitPercentage / 100) * availablePoints
        );

        if (points > cappingLimit) {
          throw new BadRequestException(
            `You can redeem a maximum of ${config.additionalSettings?.cappingLimitPercentage}% of your available points.`
          );
        }
      }

      // Available points check
      if (points > availablePoints) {
        throw new BadRequestException('Insufficient points');
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
        throw new BadRequestException(
          `You've reached your daily limit of ${maxDailyRedemptions} DBT transactions. Please try again tomorrow.`
        );
      }

      const redeemReqPoints = Number(points);
      const totalPoints = redeemReqPoints + Number(currentDayTotalPoints);

      const dailyLimit =
        config.redemptionLimits?.dbt?.daily !== undefined
          ? Number(config.redemptionLimits?.dbt?.daily)
          : 33000;

      if (Number(currentDayTotalPoints) >= dailyLimit) {
        throw new BadRequestException(
          `You've already reached your daily limit of ${dailyLimit.toLocaleString()} points. Please try again tomorrow.`
        );
      }

      if (totalPoints > dailyLimit) {
        const remainingPoints = dailyLimit - Number(currentDayTotalPoints);
        throw new BadRequestException(
          `You can only redeem ${remainingPoints.toLocaleString()} more points today.`
        );
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
        throw new BadRequestException(
          `You've already reached your monthly limit of ${monthlyLimit.toLocaleString()} points. Please try again next month.`
        );
      }

      if (totalMonthlyPoints > monthlyLimit) {
        const remainingPoints = monthlyLimit - currentMonthtotalPoints;
        throw new BadRequestException(
          `You can only redeem ${remainingPoints.toLocaleString()} more points this month.`
        );
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
            throw new BadRequestException(
              'PAN KYC is pending and is awaiting approval from the admin.'
            );
          }
          throw new BadRequestException('Complete PAN KYC to Redeem.');
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

          await this.payoutRepository.createPayout(
            {
              transaction_id,
              points: points,
              amount: amount,
              status: PayoutStatus.INITIATED,
              otp: otpEncrypted,
              otp_verified: 0,
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
      throw new BadRequestException('Transaction not found');
    }

    const config = await this.dynamicConfigRepository.getUserConfigByUserRole(
      payout.user.role.name
    );

    if (!config || !config.redemptionEnabled || !config.dbtEnabled) {
      throw new BadRequestException('Redemptions/payouts are currently disabled.');
    }

    if (payout.status !== PayoutStatus.INITIATED) {
      throw new BadRequestException('Transaction already processed');
    }

    if (!payout.otp) {
      throw new BadRequestException('OTP not found');
    }

    // Deduct points from user
    const user = await this.userRepository.findOne({ id: userId }, ['role']);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // OTP validation
    const isProduction = this.appConfigService.isProduction() || this.appConfigService.isQa();
    const defaultOtp = this.appConfigService.getNonProdRewardsOtp()?.toString() || '9988';
    const encryptedOtp = CommonUtils.encrypt(String(otp));

    if (isProduction) {
      if (payout.otp !== encryptedOtp) {
        throw new BadRequestException('Invalid OTP');
      }
    } else {
      if (otp !== defaultOtp && payout.otp !== encryptedOtp) {
        throw new BadRequestException('Invalid OTP');
      }
    }

    const realCreatedAtTime =
      payout.createdAt.getTime() - payout.createdAt.getTimezoneOffset() * 60 * 1000;

    const ageMs = Date.now() - realCreatedAtTime;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    // if (ageMs < 0 || ageMs > FIVE_MINUTES_MS) {
    //   throw new BadRequestException('OTP expired');
    // }

    const bankAccount = payout.userBeneficiary;

    if (!bankAccount) {
      throw new BadRequestException('Bank account not found');
    }

    const finalAmountToSend = isProduction ? payout.amount : 1;

    try {
      const transactionResult = await this.transactionUtils.runInTransaction(
        async (queryRunner) => {
          payout.otp_verified = 1;
          payout.otp = null;

          const remainingPoints = Number(user.points) - payout.points;

          if (remainingPoints < 0) {
            throw new BadRequestException('Insufficient points');
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
}
