import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { EntityManager, QueryRunner } from 'typeorm';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { InvoiceHistoryQueryDto } from '../dto';
import {
  InvoiceHistoryRepository,
  InvoicePointHistoryRepository,
  InvoicePairRepository,
  PairHistoryRepository,
  UserRewardRepository,
  InvoiceRepository,
} from '../repository';
import { InvoiceEntity } from '../entities/invoice.entity';
import { PointsExpiryConfigService } from 'src/modules/redemptions/services/points-expiry.service';
import { RedisLockService } from './redis-lock.service';
import { InvoiceValidationService } from './invoice-validation.service';
import { ScanSessionService } from './scan-session.service';
import { PairScanningService } from './pair-scanning.service';
import { RewardSettlementService } from './reward-settlement.service';
import { CommonUtils } from 'src/default/common/utils/common.utils';

type PairValidationResult = {
  valid: string[];
  invalid: Array<{ pairUid: string; reason: string }>;
  duplicate: string[];
};

@Injectable()
export class PairValidationService {
  constructor(
    private readonly pairRepository: InvoicePairRepository,
    private readonly historyRepository: PairHistoryRepository
  ) {}

  async validateMany(invoiceId: string, pairUids: string[]): Promise<PairValidationResult> {
    const normalized = pairUids.map((value) => value.trim()).filter(Boolean);
    const seen = new Set<string>();
    const requestDuplicates = new Set<string>();
    for (const uid of normalized) {
      if (seen.has(uid)) requestDuplicates.add(uid);
      seen.add(uid);
    }
    const unique = [...seen];
    const prior = await this.historyRepository.existing(invoiceId, unique);
    const duplicateSet = new Set([...requestDuplicates, ...prior.map((row) => row.pairUid)]);
    const candidates = unique.filter((uid) => !duplicateSet.has(uid));
    const pairs = await this.pairRepository.findForInvoice(invoiceId, candidates);
    const pairMap = new Map(pairs.map((pair) => [pair.pair_uid, pair]));
    const valid: string[] = [];
    const invalid: Array<{ pairUid: string; reason: string }> = [];

    for (const uid of candidates) {
      const pair = pairMap.get(uid);
      if (!pair) {
        invalid.push({ pairUid: uid, reason: 'PAIR_NOT_IN_INVOICE' });
      } else if (
        pair.status === InvoicePairScanStatus.SCANNED ||
        pair.status === InvoicePairScanStatus.REDEEMED ||
        pair.status === InvoicePairScanStatus.USED
      ) {
        invalid.push({ pairUid: uid, reason: 'PAIR_UNAVAILABLE' });
      } else if (pair.status === InvoicePairScanStatus.EXPIRED) {
        invalid.push({ pairUid: uid, reason: 'PAIR_EXPIRED' });
      } else {
        valid.push(uid);
      }
    }
    return { valid, invalid, duplicate: [...duplicateSet] };
  }
}

@Injectable()
export class PointCalculationService {
  calculate(invoice: InvoiceEntity, newTotalValidPairs: number): number {
    if (invoice.total_pairs <= 0 || invoice.allocated_points <= 0) return 0;
    const targetEarned = Math.floor(
      (invoice.allocated_points * Math.min(newTotalValidPairs, invoice.total_pairs)) /
        invoice.total_pairs
    );
    return Math.max(0, targetEarned - invoice.earned_points);
  }
}

@Injectable()
export class RewardService {
  constructor(
    private readonly users: UserRewardRepository,
    private readonly pointHistories: InvoicePointHistoryRepository,
    private readonly pointsExpiryConfig: PointsExpiryConfigService
  ) {}

  async award(
    userId: string,
    points: number,
    transactionId: string,
    description: string,
    queryRunner?: QueryRunner
  ): Promise<void> {
    if (points <= 0) {
      return;
    }
    const balance = await this.users.addPoints(userId, points, queryRunner);
    const expiryDays = await this.pointsExpiryConfig.getExpiryDays();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await this.pointHistories.createEarnHistory(
      {
        userId,
        points,
        balance,
        transactionId,
        description,
        expiresAt,
      },
      queryRunner
    );
  }
}

@Injectable()
export class AuditService {
  constructor(@InjectQueue('invoice-audit') private readonly queue: Queue) {}

  async record(event: string, payload: Record<string, unknown>) {
    ConsoleLogger.log(`${event} ${JSON.stringify(payload)}`, 'InvoiceAudit');
    await this.queue.add(event, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}

@Processor('invoice-audit')
export class InvoiceAuditProcessor extends WorkerHost {
  async process(job: Job<Record<string, unknown>>) {
    ConsoleLogger.log(`Processed ${job.name} audit ${job.id}`, 'InvoiceAuditProcessor');
  }
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly validationService: InvoiceValidationService,
    private readonly scanSessionService: ScanSessionService,
    private readonly pairScanningService: PairScanningService,
    private readonly rewardSettlementService: RewardSettlementService,
    private readonly histories: InvoiceHistoryRepository,
    private readonly pairHistories: PairHistoryRepository,
    private readonly invoiceRepository: InvoiceRepository
  ) {}

  validate(invoiceIdOrNumber: string, userId: string) {
    return this.validationService.validateInvoice(invoiceIdOrNumber, userId);
  }

  start(invoiceIdOrNumber: string, userId: string) {
    return this.scanSessionService.start(invoiceIdOrNumber, userId);
  }

  scan(sessionId: string, userId: string, pairCodeOrUid: string) {
    return this.pairScanningService.scanPair(sessionId, pairCodeOrUid, userId);
  }

  progress(sessionId: string, userId: string) {
    return this.scanSessionService.get(sessionId, userId);
  }

  removePair(sessionId: string, userId: string, pairCodeOrUid: string) {
    return this.pairScanningService.removePair(sessionId, pairCodeOrUid, userId);
  }

  submit(sessionId: string, userId: string) {
    return this.rewardSettlementService.submitSession(sessionId, userId);
  }

  cancel(sessionId: string, userId: string) {
    return this.scanSessionService.cancel(sessionId, userId);
  }

  pairs(sessionId: string, userId: string, page = 1, limit = 100) {
    return this.pairHistories.findPageBySession(sessionId, userId, page, limit);
  }

  async history(userId: string, query: InvoiceHistoryQueryDto) {
    const { items, total } = await this.invoiceRepository.findHistory(userId, {
      ...query,
      page: query.page || 1,
      limit: query.limit || 10,
    });

    return {
      items,
      pagination: CommonUtils.generatePaginationResponse(total, query.page, query.limit),
    };
  }

  async historyDetail(id: string, userId: string) {
    const invoice = await this.invoiceRepository.findOwnedById(id, userId);

    if (!invoice) {
      throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    }

    const pairs = await this.pairHistories.findByInvoice(invoice.id, userId);

    return {
      invoice,
      scannedPairs: pairs,
      points: invoice.earned_points,
      status: invoice.status,
    };
  }

  summary(userId: string) {
    return this.invoiceRepository.getSummary(userId);
  }
}
