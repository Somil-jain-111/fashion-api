import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PayoutRepository } from './repository/payout.repository';
import { BankAccountRepository } from './repository/bank-account.repository';
import { UserRepository } from 'src/modules/user/repository';
import { KycVerificationRepository } from 'src/modules/kyc/repository';
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
import { PayoutStatus, Payout } from './entities/payout.entity';
import { User } from 'src/modules/auth/entities';
import { PointHistory } from 'src/modules/auth/entities';

@Injectable()
export class PaymentService {
  constructor(
    private readonly payoutRepository: PayoutRepository,
    private readonly bankAccountRepository: BankAccountRepository,
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

  async payoutTransaction(userId: number, amount: number, points: number) {
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
      const bankAccount = await this.bankAccountRepository.findBankAccountByUserId(userId);
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
          const transaction_id = await CommonUtils.generateUniqueRefCode();
          const plainOtp = Math.floor(1000 + Math.random() * 9000).toString();
          const otpEncrypted = CommonUtils.encrypt(plainOtp);

          const isLive = this.appConfigService.isProduction() || this.appConfigService.isQa();
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
              bankAccount: bankAccount,
              account_number: bankAccount.account_number,
              ifsc_code: bankAccount.ifsc_internal,
              bank_name: bankAccount.bank_name,
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

  async verifyPayoutOtp(userId: number, transactionId: string, otp: string) {
    const payout = await this.payoutRepository.findLatestByTransactionId(
      transactionId,
      Number(userId),
      ['user', 'user.role', 'bankAccount']
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

    // OTP Expiry check (5 mins)
    const diffMinutes = (Date.now() - new Date(payout.createdAt).getTime()) / (1000 * 60);
    if (diffMinutes > 5 || diffMinutes < 0) {
      throw new BadRequestException('OTP expired');
    }

    const bankAccount = payout.bankAccount;
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
          const pointHistory = await this.pointHistoryRepository.create({
            user: { id: payout.user.id } as any,
            description: `DBT Amount: ${payout.amount}`,
            date: new Date(),
            status: PointStatusEnum.redeem,
            type: RedemptionType.BANK,
            transaction_id: payout.transaction_id,
            points: payout.points,
            user_remaining_points: remainingPoints,
            payout: payout,
          } as any);

          const savedPointHistory = await this.pointHistoryRepository.save(pointHistory, queryRunner);

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
      const decryptedAccount = await this.kycService.decryptKycData(bankAccount.account_number);
      const decryptedIfsc = await this.kycService.decryptKycData(bankAccount.ifsc_internal);

      await this.rewardsService.payoutAmountBank({
        type: 'bank',
        name: bankAccount.bank_holder_name_internal,
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
