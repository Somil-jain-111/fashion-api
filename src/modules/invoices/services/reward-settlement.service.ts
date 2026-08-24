import { Injectable } from '@nestjs/common';
import { TransactionService } from 'src/default/databases/transaction/transaction.service';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import {
  InvoiceHistoryRepository,
  InvoicePairRepository,
  InvoicePointHistoryRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
  UserRewardRepository,
} from '../repository';
import { InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { InvoiceHistoryStatus, ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { PointsExpiryConfigService } from 'src/modules/redemptions/services/points-expiry.service';
import { RedisLockService } from './redis-lock.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationEventType } from 'src/modules/notifications/enum/notification-event-type.enum';

const POINTS_PER_PAIR = 5;

export interface SubmissionResultDto {
  invoiceId: string;
  submissionId: string;
  sessionId: string;
  totalPairs: number;
  scannedPairs: number;
  remainingPairs: number;
  pointsAwarded: number;
  pointsPerPair: number;
  status: string;
  distributor: {
    name: string;
    address: string;
    state: string;
    city: string;
  };
}

@Injectable()
export class RewardSettlementService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly sessionRepository: InvoiceSessionRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly pairRepository: InvoicePairRepository,
    private readonly pairHistoryRepository: PairHistoryRepository,
    private readonly historyRepository: InvoiceHistoryRepository,
    private readonly userRewardRepository: UserRewardRepository,
    private readonly pointHistoryRepository: InvoicePointHistoryRepository,
    private readonly pointsExpiryConfig: PointsExpiryConfigService,
    private readonly lock: RedisLockService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService
  ) {}

  async submitSession(sessionId: string, userId: string): Promise<SubmissionResultDto> {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      let invoiceNo: string = '';

      const result = await this.transactionService.runInTransaction(async (queryRunner) => {
        // 1. Verify active session for req.user.id
        const session = await this.sessionRepository.findOwned(
          sessionId,
          userId,
          queryRunner,
          true
        );

        if (!session) {
          throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
        }

        if (session.status !== ScanSessionStatus.ACTIVE) {
          throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
        }

        invoiceNo = session.invoiceNumber;

        const invoice = await this.invoiceRepository
          .createQueryBuilder('invoice', queryRunner)
          .leftJoinAndSelect('invoice.distributor', 'distributor')
          .leftJoinAndSelect('distributor.storeInformation', 'storeInfo')
          .setLock('pessimistic_write')
          .where('invoice.id = :invoiceId', { invoiceId: session.invoice.id })
          .getOneOrFail();

        const submissionId = CommonUtils.generateSubmissionId();

        // Fetch all scanned pairs across all sessions for this invoice via repository
        const scannedPairDetails = await this.pairRepository.findScannedPairsForInvoice(
          String(session.invoice.id),
          queryRunner
        );

        const scannedCount = Math.max(invoice.scanned_pairs, scannedPairDetails.length);

        // 2. Allow submission even if scannedPairs < totalPairs (partial scan allowed)
        // 3. Calculate final earned reward points based on scanned items
        let points = 0;
        if (invoice.total_pairs > 0 && invoice.allocated_points > 0) {
          const targetEarned = Math.floor(
            (invoice.allocated_points * Math.min(scannedCount, invoice.total_pairs)) /
              invoice.total_pairs
          );
          points = Math.max(0, targetEarned - invoice.earned_points);
        }

        // Credit reward points to user account / wallet and record audit logs
        if (points > 0) {
          const balance = await this.userRewardRepository.addPoints(userId, points, queryRunner);
          const expiryDays = await this.pointsExpiryConfig.getExpiryDays();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + expiryDays);

          await this.pointHistoryRepository.createEarnHistory(
            {
              userId,
              points,
              balance,
              transactionId: `invoice:${sessionId}:${scannedCount}`,
              description: `Invoice scan reward for ${invoice.invoice_no}`,
              expiresAt,
              invoiceId: Number(invoice.id),
            },
            queryRunner
          );
        }

        // Mark all scanned InvoicePairDetail items permanently as REDEEMED with timestamp via repository
        if (scannedPairDetails.length > 0) {
          await this.pairRepository.markScannedAsRedeemed(
            scannedPairDetails.map((p) => p.id),
            userId,
            queryRunner
          );
        }

        // Update session status = COMPLETED
        session.status = ScanSessionStatus.COMPLETED;
        session.completedAt = new Date();
        await this.sessionRepository.saveSession(session, queryRunner);

        // Update invoice scan_status = SCANNED and status = COMPLETED, store submission_id
        invoice.scanned_pairs = scannedCount;
        invoice.earned_points += points;
        invoice.scan_status =
          scannedCount >= invoice.total_pairs
            ? InvoiceScanStatus.FULLY_SCANNED
            : InvoiceScanStatus.SCANNED;
        invoice.status = InvoiceStatus.COMPLETED;
        invoice.submission_id = submissionId;
        await this.invoiceRepository.saveInvoice(invoice, queryRunner);

        // Record history audit log
        await this.historyRepository.saveHistory(
          {
            invoice: { id: Number(session.invoice.id) } as any,
            invoiceNumber: session.invoiceNumber,
            sessionId,
            user: { id: Number(userId) } as any,
            status: InvoiceHistoryStatus.COMPLETED,
            pointsAwarded: points,
            metadata: { submittedPairs: scannedCount, submissionId },
          },
          queryRunner
        );

        const addressInfo = invoice.distributor?.addresses?.[0];
        const distributorAddressParts = addressInfo
          ? [addressInfo.address_line_1, addressInfo.address_line_2].filter(Boolean)
          : [];

        return {
          invoiceId: String(invoice.id),
          submissionId,
          sessionId,
          totalPairs: invoice.total_pairs,
          scannedPairs: scannedCount,
          remainingPairs: Math.max(0, invoice.total_pairs - scannedCount),
          pointsAwarded: points,
          pointsPerPair: POINTS_PER_PAIR,
          status: session.status,
          distributor: {
            name:
              invoice.distributor?.firmName ||
              invoice.distributor?.username ||
              invoice.party_name ||
              '',
            address: distributorAddressParts.join(', '),
            state: addressInfo?.state_name || '',
            city: addressInfo?.city_name || '',
          },
        };
      });

      await Promise.all([
        this.redis.delete(`session:${sessionId}:${userId}`),
        this.redis.delete(`invoice:${invoiceNo}:${userId}`),
      ]);

      await this.notifications.notify(
        userId,
        NotificationEventType.INVOICE_SUBMITTED,
        { invoiceNumber: invoiceNo, scannedPairs: result.scannedPairs },
        { type: 'invoice', id: result.invoiceId }
      );
      if (result.pointsAwarded > 0) {
        await this.notifications.notify(
          userId,
          NotificationEventType.POINTS_ALLOCATED,
          { points: result.pointsAwarded, invoiceNumber: invoiceNo },
          { type: 'invoice', id: result.invoiceId }
        );
      }

      return result;
    });
  }
}
