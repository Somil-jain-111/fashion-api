import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionService } from 'src/default/databases/transaction/transaction.service';
import { RedisService } from 'src/default/databases/redis/redis.service';
import {
  InvoiceHistoryRepository,
  InvoicePairRepository,
  InvoicePointHistoryRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
  UserRewardRepository,
} from '../repository';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { InvoiceHistoryStatus, ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { PointsExpiryConfigService } from 'src/modules/redemptions/services/points-expiry.service';
import { RedisLockService } from './redis-lock.service';

export interface SubmissionResultDto {
  sessionId: string;
  scannedPairs: number;
  pointsAwarded: number;
  status: string;
  remainingPairs: number;
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
    private readonly redis: RedisService
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
          throw new NotFoundException(`Session ${sessionId} not found`);
        }
        if (session.status !== ScanSessionStatus.ACTIVE) {
          throw new BadRequestException(
            `Session is not active (current status: ${session.status})`
          );
        }

        invoiceNo = session.invoiceNumber;
        const invoice = await this.invoiceRepository.findByIdForUpdate(
          session.invoiceId,
          queryRunner
        );

        // Fetch scanned pairs for this session
        const pairRepo = queryRunner.manager.getRepository(InvoicePairDetailEntity);
        const scannedPairDetails = await pairRepo
          .createQueryBuilder('pair')
          .innerJoin('pair.assortment', 'assortment')
          .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoiceId })
          .andWhere('pair.session_id = :sessionId', { sessionId })
          .getMany();

        const scannedCount = Math.max(session.scannedPairs, scannedPairDetails.length);

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
            },
            queryRunner
          );
        }

        // Mark all scanned InvoicePairDetail items permanently as scanned with timestamp
        if (scannedPairDetails.length > 0) {
          await pairRepo.update(
            scannedPairDetails.map((p) => p.id),
            {
              status: InvoicePairScanStatus.REDEEMED,
              scanned_at: new Date(),
              scanned_by: userId,
            }
          );
        }

        // Update session status = COMPLETED
        session.status = ScanSessionStatus.COMPLETED;
        session.completedAt = new Date();
        await this.sessionRepository.saveSession(session, queryRunner);

        // Update invoice scan_status = SCANNED and status = COMPLETED
        invoice.scanned_pairs = scannedCount;
        invoice.earned_points += points;
        invoice.scan_status =
          scannedCount >= invoice.total_pairs
            ? InvoiceScanStatus.FULLY_SCANNED
            : InvoiceScanStatus.SCANNED;
        invoice.status = InvoiceStatus.COMPLETED;
        await this.invoiceRepository.saveInvoice(invoice, queryRunner);

        // Record history audit log
        await this.historyRepository.saveHistory(
          {
            invoiceId: session.invoiceId,
            invoiceNumber: session.invoiceNumber,
            sessionId,
            userId,
            status: InvoiceHistoryStatus.COMPLETED,
            pointsAwarded: points,
            metadata: { submittedPairs: scannedCount },
          },
          queryRunner
        );

        return {
          sessionId,
          scannedPairs: scannedCount,
          pointsAwarded: points,
          status: session.status,
          remainingPairs: Math.max(0, invoice.total_pairs - scannedCount),
        };
      });

      await Promise.all([
        this.redis.delete(`session:${sessionId}:${userId}`),
        this.redis.delete(`invoice:${invoiceNo}:${userId}`),
      ]);

      return result;
    });
  }
}
