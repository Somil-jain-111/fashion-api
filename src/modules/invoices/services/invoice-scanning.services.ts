import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import {
  InvoiceHistoryStatus,
  InvoiceType,
  PairHistoryStatus,
  ScanSessionStatus,
  ScanSource,
} from '../enum/invoice-scan-session.enum';
import { InvoiceHistoryQueryDto, InvoiceSummaryResponseDto, ScanProgressResponseDto } from '../dto';
import {
  InvoiceHistoryRepository,
  InvoicePointHistoryRepository,
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
  UserRewardRepository,
  InvoiceItemRepository,
} from '../repository';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { PairScanHistoryEntity } from '../entities/pair-scan-history.entity';
import { InvoiceEntity } from '../entities/invoice.entity';
import { RetailerScanAgeService } from './retailer-scan-age.service';
import { SkuQuantityValidationService } from './sku-quantity-validation.service';
import { RateValidationService } from './rate-validation.service';
import { InvoiceExceptionService } from './invoice-exception.service';
import { ScanExceptionType } from '../enum/exception.enum';
import { PointsExpiryConfigService } from 'src/modules/redemptions/services/points-expiry.service';

const CACHE_TTL_SECONDS = 30 * 60;
const LOCK_TTL_MS = 15_000;

@Injectable()
export class RedisLockService {
  constructor(private readonly redis: RedisService) {}

  async withLock<T>(key: string, work: () => Promise<T>): Promise<T> {
    const token = randomUUID();
    const acquired = await this.redis.client.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
    if (!acquired) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.LOCK_UNAVAILABLE);
    try {
      return await work();
    } finally {
      await this.redis.client.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then
           return redis.call("del", KEYS[1])
         else return 0 end`,
        1,
        key,
        token
      );
    }
  }
}

@Injectable()
export class InvoiceValidationService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly sessions: InvoiceSessionRepository,
    private readonly redis: RedisService,
    private readonly scanAge: RetailerScanAgeService
  ) {}

  // async getValidInvoice(invoiceNumber: string, userId: string) {
  //   const cacheKey = `invoice:${invoiceNumber}:${userId}`;
  //   let invoice = await this.redis.get<InvoiceEntity>(cacheKey);
  //   if (!invoice) {
  //     invoice = await this.invoices.findOwnedByNumber(invoiceNumber, userId);
  //     if (invoice) await this.redis.set(cacheKey, invoice, CACHE_TTL_SECONDS);
  //   }
  //   if (!invoice) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
  //   if (invoice.status !== InvoiceStatus.APPROVED)
  //     throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_INACTIVE);
  //   if (invoice.expires_at && new Date(invoice.expires_at).getTime() <= Date.now())
  //     throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_EXPIRED);
  //   // Once every pair has been scanned & rewarded there is nothing left to do — this is the
  //   // hard "one-time only" gate: a SINGLE-type invoice can only ever complete this once, and a
  //   // MULTIPLE-type invoice has nothing left to submit once it's fully scanned either way.
  //   if (
  //     invoice.scan_status === InvoiceScanStatus.FULLY_SCANNED ||
  //     (invoice.total_pairs > 0 && invoice.scanned_pairs >= invoice.total_pairs)
  //   ) {
  //     throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_ALREADY_SCANNED);
  //   }
  //   return invoice;
  // }

  async getValidInvoice(invoiceNumber: string, userId: string) {
    const cacheKey = `invoice:${invoiceNumber}:${userId}`;
    let invoice = await this.redis.get<InvoiceEntity>(cacheKey);
    if (!invoice || !invoice.invoice_date) {
      invoice = await this.invoices.findOwnedByNumber(invoiceNumber, userId);
      if (invoice) await this.redis.set(cacheKey, invoice, CACHE_TTL_SECONDS);
      await this.redis.set(cacheKey, invoice, CACHE_TTL_SECONDS);
    }
    if (!invoice) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    if (invoice.status !== InvoiceStatus.APPROVED)
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_INACTIVE);

    // >>> CHANGED: expires_at remains a hard absolute ceiling if your program
    // still wants one (e.g. scheme end date) — but it is no longer the scan
    // eligibility check. That's now driven by invoice_date + configurable
    // retailer scan-age window per BRD §3.4.1 / Q1 / Q2.
    if (invoice.expires_at && new Date(invoice.expires_at).getTime() <= Date.now())
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_EXPIRED);

    const { days: scanAgeDays } = await this.scanAge.getEffectiveScanAgeDays(
      String(invoice.user?.id ?? userId)
    );
    if (!invoice.invoice_date) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    }

    const { eligible, eligibleUntil } = RetailerScanAgeService.computeEligibility(
      new Date(invoice.invoice_date),
      scanAgeDays
    );
    if (!eligible) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_SCAN_WINDOW_EXPIRED, {
        eligibleUntil,
      } as any);
    }

    // Once every pair has been scanned & rewarded there is nothing left to do — this is the
    // hard "one-time only" gate: a SINGLE-type invoice can only ever complete this once, and a
    // MULTIPLE-type invoice has nothing left to submit once it's fully scanned either way.
    if (
      invoice.scan_status === InvoiceScanStatus.FULLY_SCANNED ||
      (invoice.total_pairs > 0 && invoice.scanned_pairs >= invoice.total_pairs)
    ) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_ALREADY_SCANNED);
    }
    return invoice;
  }

  async validate(invoiceNumber: string, userId: string): Promise<InvoiceSummaryResponseDto> {
    const invoice = await this.getValidInvoice(invoiceNumber, userId);
    const session = await this.sessions.findActive(invoice.id, userId);
    const scanned = session?.scannedPairs ?? invoice.scanned_pairs ?? 0;
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_no,
      invoiceType: invoice.invoice_type,
      expectedPairs: invoice.total_pairs,
      alreadyScanned: scanned,
      remainingPairs: Math.max(0, invoice.total_pairs - scanned),
      resume: Boolean(session),
    };
  }
}

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
    manager: EntityManager,
    userId: string,
    points: number,
    transactionId: string,
    description: string
  ): Promise<void> {
    if (points <= 0) return;
    const balance = await this.users.addPoints(userId, points, manager);
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
        expiresAt
      },
      manager
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
export class ScanSessionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly invoiceValidation: InvoiceValidationService,
    private readonly pairValidation: PairValidationService,
    private readonly sessions: InvoiceSessionRepository,
    private readonly pairHistory: PairHistoryRepository,
    private readonly histories: InvoiceHistoryRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly pairRepository: InvoicePairRepository,
    private readonly lock: RedisLockService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly pointCalculation: PointCalculationService,
    private readonly rewardService: RewardService,
    private readonly skuQuantityValidation: SkuQuantityValidationService, 
    private readonly rateValidation: RateValidationService, 
    private readonly invoiceItemRepository: InvoiceItemRepository, 
    private readonly exceptions: InvoiceExceptionService // 
  ) {}

  private progress(session: InvoiceScanSessionEntity): ScanProgressResponseDto {
    return {
      sessionId: session.sessionId,
      progress: session.scannedPairs,
      remaining: Math.max(0, session.expectedPairs - session.validPairs),
      expected: session.expectedPairs,
      valid: session.validPairs,
      invalid: session.invalidPairs,
      status: session.status,
    };
  }

  async start(invoiceNumber: string, userId: string) {
    const invoice = await this.invoiceValidation.getValidInvoice(invoiceNumber, userId);
    // Scoped per-user: invoice_no is only unique per distributor (master_id), so the same
    // invoiceNumber string can legitimately belong to different retailers. Locking on the
    // number alone would serialize unrelated users against each other for no reason.
    return this.lock.withLock(`lock:invoice:${invoiceNumber}:${userId}`, async () => {
      const existing = await this.sessions.findActive(invoice.id, userId);
      if (existing) return this.progress(existing);
      const session = await this.sessions.createSession({
        sessionId: randomUUID(),
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_no,
        userId,
        invoiceType: invoice.invoice_type,
        expectedPairs: invoice.total_pairs,
        scannedPairs: 0,
        validPairs: 0,
        invalidPairs: 0,
        status: ScanSessionStatus.ACTIVE,
        startedAt: new Date(),
      });
      await this.audit.record('SESSION_STARTED', {
        sessionId: session.sessionId,
        invoiceId: invoice.id,
        userId,
      });
      await this.histories.saveHistory({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_no,
        sessionId: session.sessionId,
        userId,
        status: InvoiceHistoryStatus.STARTED,
        pointsAwarded: 0,
      });
      await this.redis.set(
        // `session:${session.sessionId}`,
        `session:${session.sessionId}:${userId}`,
        this.progress(session),
        CACHE_TTL_SECONDS
      );
      return this.progress(session);
    });
  }

  async get(sessionId: string, userId: string) {
    const cached = await this.redis.get<ScanProgressResponseDto>(`session:${sessionId}:${userId}`);
    if (cached) return cached;
    const session = await this.ownedActive(sessionId, userId, false);
    const response = this.progress(session);
    await this.redis.set(`session:${sessionId}:${userId}`, response, CACHE_TTL_SECONDS);
    return response;
  }

  private async ownedActive(sessionId: string, userId: string, requireActive = true) {
    const session = await this.sessions.findOwned(sessionId, userId);
    if (!session) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
    if (requireActive && session.status !== ScanSessionStatus.ACTIVE)
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
    return session;
  }

  // async scan(sessionId: string, userId: string, pairUid: string) {
  //   const result = await this.bulkScan(sessionId, userId, [pairUid], ScanSource.SINGLE);
  //   if (result.duplicate.length)
  //     throw new BusinessException(ERROR_CODES.INVOICE_SCAN.DUPLICATE_PAIR);
  //   if (result.invalid.length) {
  //     const code =
  //       result.invalid[0].reason === 'PAIR_UNAVAILABLE'
  //         ? ERROR_CODES.INVOICE_SCAN.PAIR_UNAVAILABLE
  //         : ERROR_CODES.INVOICE_SCAN.PAIR_NOT_IN_INVOICE;
  //     throw new BusinessException(code);
  //   }
  //   return { status: 'SUCCESS', progress: result.progress, remaining: result.remaining };
  // }

    async scan(sessionId: string, userId: string, pairUid: string) {
    const result = await this.bulkScan(sessionId, userId, [pairUid], ScanSource.SINGLE);
    if (result.duplicate.length)
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.DUPLICATE_PAIR);
    if (result.invalid.length) {
      const reason = result.invalid[0].reason;
      const code = ScanSessionService.errorCodeForInvalidReason(reason); // >>> CHANGED (was inline ternary; now handles the new SKU/rate/mismatch reasons too)
      throw new BusinessException(code);
    }
    return { status: 'SUCCESS', progress: result.progress, remaining: result.remaining };
  }

   private static errorCodeForInvalidReason(reason: string) {
    switch (reason) {
      case 'PAIR_UNAVAILABLE':
        return ERROR_CODES.INVOICE_SCAN.PAIR_UNAVAILABLE;
      case 'PAIR_EXPIRED':
        return ERROR_CODES.INVOICE_SCAN.PAIR_EXPIRED;
      case 'SKU_QUANTITY_EXCEEDED':
        return ERROR_CODES.INVOICE_SCAN.SKU_QUANTITY_EXCEEDED;
      case 'ITEM_CODE_NOT_ON_INVOICE':
      case 'ITEM_MAPPING_NOT_FOUND':
        return ERROR_CODES.INVOICE_SCAN.ITEM_MAPPING_MISMATCH;
      case 'ITEM_RATE_MISMATCH':
        return ERROR_CODES.INVOICE_SCAN.ITEM_RATE_MISMATCH;
      case 'ITEM_RATE_NOT_AVAILABLE':
        return ERROR_CODES.INVOICE_SCAN.ITEM_RATE_NOT_AVAILABLE;
      default:
        return ERROR_CODES.INVOICE_SCAN.PAIR_NOT_IN_INVOICE;
    }
  }


  // async bulkScan(sessionId: string, userId: string, pairUids: string[], source = ScanSource.BULK) {
  //   return this.lock.withLock(`lock:session:${sessionId}`, async () => {
  //     const session = await this.ownedActive(sessionId, userId);
  //     const validation = await this.pairValidation.validateMany(session.invoiceId, pairUids);
  //     const rows = [
  //       ...validation.valid.map((pairUid) => ({
  //         sessionId,
  //         invoiceId: session.invoiceId,
  //         pairUid,
  //         userId,
  //         status: PairHistoryStatus.VALID,
  //         scanSource: source,
  //       })),
  //       ...validation.invalid.map(({ pairUid, reason }) => ({
  //         sessionId,
  //         invoiceId: session.invoiceId,
  //         pairUid,
  //         userId,
  //         status: PairHistoryStatus.INVALID,
  //         scanSource: source,
  //         failureReason: reason,
  //       })),
  //     ];
  //     await this.pairHistory.insertIgnore(rows);
  //     // Belt-and-suspenders: also flip the physical pair's own status on
  //     // invoice_pair_details (source of truth, with its own scanned_by/scanned_at audit
  //     // trail), instead of relying solely on pair_scan_history for anti-replay protection.
  //     await this.pairRepository.markStatusByUids(
  //       session.invoiceId,
  //       validation.valid,
  //       InvoicePairScanStatus.SCANNED,
  //       userId
  //     );
  //     const counts = await this.pairHistory.countBySession(sessionId);
  //     session.scannedPairs = counts.scanned;
  //     session.validPairs = counts.valid;
  //     session.invalidPairs = counts.invalid;
  //     session.lastScannedAt = new Date();
  //     await this.sessions.saveSession(session);
  //     await this.redis.delete(`session:${sessionId}:${userId}`);
  //     await this.audit.record('PAIRS_SCANNED', {
  //       sessionId,
  //       userId,
  //       valid: validation.valid.length,
  //       invalid: validation.invalid.length,
  //       duplicate: validation.duplicate.length,
  //     });
  //     return {
  //       valid: validation.valid,
  //       invalid: validation.invalid,
  //       duplicate: validation.duplicate,
  //       progress: session.scannedPairs,
  //       remaining: Math.max(0, session.expectedPairs - session.validPairs),
  //     };
  //   });
  // }
  async bulkScan(sessionId: string, userId: string, pairUids: string[], source = ScanSource.BULK) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const session = await this.ownedActive(sessionId, userId);
      const validation = await this.pairValidation.validateMany(session.invoiceId, pairUids);

      // >>> NEW: SKU-level quantity validation (BRD Q4). Runs on top of the
      // pair-row-level result — a pair can be a structurally valid, unscanned
      // pair and STILL get rejected here if scanning it would push its SKU
      // over the invoiced quantity for that item_code.
      const skuResult = await this.skuQuantityValidation.validate(session.invoiceId, validation.valid);

      // >>> NEW: rate validation (Q3), scoped to the item codes that made it
      // past the SKU-quantity check — no point rate-checking a SKU we're
      // about to reject anyway.
      const itemCodesForAllowed = await this.pairRepository.findItemCodesForPairs(
        session.invoiceId,
        skuResult.allowed
      );
      const distinctItemCodes = [...new Set(itemCodesForAllowed.values())];
      const invoiceRates = await this.invoiceItemRepository.rateByItemCode(session.invoiceId);
      const rateResults = await this.rateValidation.checkRates(distinctItemCodes, invoiceRates);

      const rateRejectedItemCodes = new Set(
        [...rateResults.entries()]
          .filter(([, result]) => result.status !== 'OK')
          .map(([itemCode]) => itemCode)
      );

      const finalValid: string[] = [];
      const rateRejected: Array<{ pairUid: string; itemCode: string; reason: string }> = [];
      for (const pairUid of skuResult.allowed) {
        const itemCode = itemCodesForAllowed.get(pairUid);
        if (itemCode && rateRejectedItemCodes.has(itemCode)) {
          const result = rateResults.get(itemCode);
          rateRejected.push({
            pairUid,
            itemCode,
            reason: result?.status === 'NOT_FOUND' ? 'ITEM_RATE_NOT_AVAILABLE' : 'ITEM_RATE_MISMATCH',
          });
        } else {
          finalValid.push(pairUid);
        }
      }

      // >>> NEW: flag every rejection that isn't a plain "pair unavailable /
      // already used" as a reviewable exception (Q4: "flagged as an
      // exception/mismatch case for further review").
      const exceptionEntries = [
        ...skuResult.exceeded.map((entry) => ({
          invoiceId: session.invoiceId,
          sessionId,
          pairUid: entry.pairUid,
          itemCode: entry.itemCode,
          exceptionType:
            entry.reason === 'SKU_QUANTITY_EXCEEDED'
              ? ScanExceptionType.QTY_MISMATCH
              : ScanExceptionType.MAPPING_MISMATCH,
          rawPayload: entry,
        })),
        ...rateRejected.map((entry) => ({
          invoiceId: session.invoiceId,
          sessionId,
          pairUid: entry.pairUid,
          itemCode: entry.itemCode,
          exceptionType:
            entry.reason === 'ITEM_RATE_NOT_AVAILABLE'
              ? ScanExceptionType.RATE_NOT_AVAILABLE
              : ScanExceptionType.RATE_MISMATCH,
          rawPayload: entry,
        })),
      ];
      if (exceptionEntries.length) await this.exceptions.flagMany(exceptionEntries);

      const combinedInvalid = [
        ...validation.invalid,
        ...skuResult.exceeded.map((entry) => ({ pairUid: entry.pairUid, reason: entry.reason })),
        ...rateRejected.map((entry) => ({ pairUid: entry.pairUid, reason: entry.reason })),
      ];

      const rows = [
        ...finalValid.map((pairUid) => ({
          sessionId,
          invoiceId: session.invoiceId,
          pairUid,
          userId,
          status: PairHistoryStatus.VALID,
          scanSource: source,
        })),
        ...combinedInvalid.map(({ pairUid, reason }) => ({
          sessionId,
          invoiceId: session.invoiceId,
          pairUid,
          userId,
          status: PairHistoryStatus.INVALID,
          scanSource: source,
          failureReason: reason,
        })),
      ];
      await this.pairHistory.insertIgnore(rows);
      await this.pairRepository.markStatusByUids(
        session.invoiceId,
        finalValid, // >>> CHANGED: was validation.valid — now only pairs that survived SKU + rate checks get marked SCANNED
        InvoicePairScanStatus.SCANNED,
        userId
      );
      const counts = await this.pairHistory.countBySession(sessionId);
      session.scannedPairs = counts.scanned;
      session.validPairs = counts.valid;
      session.invalidPairs = counts.invalid;
      session.lastScannedAt = new Date();
      await this.sessions.saveSession(session);
      await this.redis.delete(`session:${sessionId}:${userId}`);
      await this.audit.record('PAIRS_SCANNED', {
        sessionId,
        userId,
        valid: finalValid.length,
        invalid: combinedInvalid.length,
        duplicate: validation.duplicate.length,
      });
      return {
        valid: finalValid,
        invalid: combinedInvalid,
        duplicate: validation.duplicate,
        progress: session.scannedPairs,
        remaining: Math.max(0, session.expectedPairs - session.validPairs),
      };
    });
  }

    async removePair(sessionId: string, userId: string, pairUid: string) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const session = await this.ownedActive(sessionId, userId);
      const removed = await this.pairHistory.deleteOneActive(sessionId, pairUid);
      if (!removed) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.PAIR_NOT_IN_SESSION);
      await this.pairRepository.revertStatusByUids(session.invoiceId, [pairUid]);
      const counts = await this.pairHistory.countBySession(sessionId);
      session.scannedPairs = counts.scanned;
      session.validPairs = counts.valid;
      session.invalidPairs = counts.invalid;
      await this.sessions.saveSession(session);
      await this.redis.delete(`session:${sessionId}:${userId}`);
      await this.audit.record('PAIR_REMOVED', { sessionId, userId, pairUid });
      return this.progress(session);
    });
  }

  async removeAllPairs(sessionId: string, userId: string) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const session = await this.ownedActive(sessionId, userId);
      const removedUids = await this.pairHistory.deleteAllActiveBySession(sessionId);
      if (removedUids.length) {
        await this.pairRepository.revertStatusByUids(session.invoiceId, removedUids);
      }
      session.scannedPairs = 0;
      session.validPairs = 0;
      session.invalidPairs = 0;
      await this.sessions.saveSession(session);
      await this.redis.delete(`session:${sessionId}:${userId}`);
      await this.audit.record('ALL_PAIRS_REMOVED', { sessionId, userId, removedCount: removedUids.length });
      return this.progress(session);
    });
  }

  // async submit(sessionId: string, userId: string) {
  //   return this.lock.withLock(`lock:session:${sessionId}`, async () => {
  //     let invoiceNumber: string;
  //     const response = await this.dataSource.transaction(async (manager) => {
  //       const session = await this.sessions.findOwned(sessionId, userId, manager, true);
  //       if (!session) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
  //       invoiceNumber = session.invoiceNumber;
  //       if (session.status !== ScanSessionStatus.ACTIVE)
  //         throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
  //       if (
  //         session.invoiceType === InvoiceType.SINGLE &&
  //         session.validPairs < session.expectedPairs
  //       ) {
  //         throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SINGLE_INVOICE_INCOMPLETE);
  //       }
  //       const pending = await this.pairHistory.pendingValid(sessionId, manager);
  //       if (!pending.length) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.NO_VALID_PAIRS);
  //       const invoice = await this.invoiceRepository.findByIdForUpdate(session.invoiceId, manager);
  //       const newInvoiceValid = Math.min(
  //         invoice.total_pairs,
  //         invoice.scanned_pairs + pending.length
  //       );
  //       const points = this.pointCalculation.calculate(invoice, newInvoiceValid);
  //       await this.rewardService.award(
  //         manager,
  //         userId,
  //         points,
  //         `invoice:${sessionId}:${newInvoiceValid}`,
  //         `Invoice reward for ${session.invoiceNumber}`
  //       );
  //       await this.pairHistory.markRewarded(
  //         pending.map((row) => row.id),
  //         manager
  //       );
  //       // Final state on the source-of-truth pair table (see bulkScan's SCANNED marking).
  //       await this.pairRepository.markStatusByUids(
  //         session.invoiceId,
  //         pending.map((row) => row.pairUid),
  //         InvoicePairScanStatus.REDEEMED,
  //         userId,
  //         manager
  //       );
  //       invoice.scanned_pairs = newInvoiceValid;
  //       invoice.earned_points += points;
  //       invoice.scan_status =
  //         newInvoiceValid >= invoice.total_pairs
  //           ? InvoiceScanStatus.FULLY_SCANNED
  //           : InvoiceScanStatus.PARTIALLY_SCANNED;
  //       await this.invoiceRepository.saveInvoice(invoice, manager);
  //       const completed = session.validPairs >= session.expectedPairs;
  //       if (completed) {
  //         session.status = ScanSessionStatus.COMPLETED;
  //         session.completedAt = new Date();
  //       }
  //       await this.sessions.saveSession(session, manager);
  //       const historyStatus = completed
  //         ? InvoiceHistoryStatus.COMPLETED
  //         : InvoiceHistoryStatus.PARTIALLY_SUBMITTED;
  //       await this.histories.saveHistory(
  //         {
  //           invoiceId: session.invoiceId,
  //           invoiceNumber: session.invoiceNumber,
  //           sessionId,
  //           userId,
  //           status: historyStatus,
  //           pointsAwarded: points,
  //           metadata: { submittedPairs: pending.length },
  //         },
  //         manager
  //       );
  //       // Per-pair and audit history are only ever needed while this session is still in
  //       // progress (countBySession/pendingValid read every row to track cumulative
  //       // progress across partial submits). Once truly COMPLETED, nothing will scan or
  //       // submit against this session again, so it's safe to purge both logs now — the
  //       // final tallies already live on the session/invoice rows themselves.
  //       if (completed) {
  //         await this.pairHistory.deleteBySession(sessionId, manager);
  //         await this.histories.deleteBySession(sessionId, manager);
  //       }
  //       return {
  //         pointsAwarded: points,
  //         validPairs: pending.length,
  //         invalidPairs: session.invalidPairs,
  //         remainingPairs: Math.max(0, session.expectedPairs - session.validPairs),
  //       };
  //     });
  //     await Promise.all([
  //       this.redis.delete(`session:${sessionId}:${userId}`),
  //       // The invoice snapshot cached by InvoiceValidationService.getValidInvoice is now
  //       // stale (scanned_pairs/scan_status just changed) — without this, a re-validate/start
  //       // within the cache TTL would read pre-submit data and miss the already-scanned gate.
  //       this.redis.delete(`invoice:${invoiceNumber}:${userId}`),
  //       this.audit.record('SESSION_SUBMITTED', { sessionId, userId, ...response }),
  //     ]);
  //     return response;
  //   });
  // }
  async submit(sessionId: string, userId: string) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      let invoiceNumber: string;
      const response = await this.dataSource.transaction(async (manager) => {
        const session = await this.sessions.findOwned(sessionId, userId, manager, true);
        if (!session) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
        invoiceNumber = session.invoiceNumber;
        if (session.status !== ScanSessionStatus.ACTIVE)
          throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
        if (
          session.invoiceType === InvoiceType.SINGLE &&
          session.validPairs < session.expectedPairs
        ) {
          throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SINGLE_INVOICE_INCOMPLETE);
        }
        const pending = await this.pairHistory.pendingValid(sessionId, manager);
        if (!pending.length) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.NO_VALID_PAIRS);
        const invoice = await this.invoiceRepository.findByIdForUpdate(session.invoiceId, manager);
        const newInvoiceValid = Math.min(
          invoice.total_pairs,
          invoice.scanned_pairs + pending.length
        );
        const points = this.pointCalculation.calculate(invoice, newInvoiceValid);
        await this.rewardService.award(
          manager,
          userId,
          points,
          `invoice:${sessionId}:${newInvoiceValid}`,
          `Invoice reward for ${session.invoiceNumber}`
        );
        await this.pairHistory.markRewarded(
          pending.map((row) => row.id),
          manager
        );
        await this.pairRepository.markStatusByUids(
          session.invoiceId,
          pending.map((row) => row.pairUid),
          InvoicePairScanStatus.REDEEMED,
          userId,
          manager
        );
        invoice.scanned_pairs = newInvoiceValid;
        invoice.earned_points += points;
        invoice.scan_status =
          newInvoiceValid >= invoice.total_pairs
            ? InvoiceScanStatus.FULLY_SCANNED
            : InvoiceScanStatus.PARTIALLY_SCANNED;
        await this.invoiceRepository.saveInvoice(invoice, manager);
        const completed = session.validPairs >= session.expectedPairs;
        if (completed) {
          session.status = ScanSessionStatus.COMPLETED;
          session.completedAt = new Date();
        }
        await this.sessions.saveSession(session, manager);
        const historyStatus = completed
          ? InvoiceHistoryStatus.COMPLETED
          : InvoiceHistoryStatus.PARTIALLY_SUBMITTED;
        await this.histories.saveHistory(
          {
            invoiceId: session.invoiceId,
            invoiceNumber: session.invoiceNumber,
            sessionId,
            userId,
            status: historyStatus,
            pointsAwarded: points,
            metadata: { submittedPairs: pending.length },
          },
          manager
        );
        // if (completed) {
          // await this.pairHistory.deleteBySession(sessionId, manager);
          // await this.histories.deleteBySession(sessionId, manager);
        // }
        return {
          pointsAwarded: points,
          validPairs: pending.length,
          invalidPairs: session.invalidPairs,
          remainingPairs: Math.max(0, session.expectedPairs - session.validPairs),
        };
      });
      await Promise.all([
        this.redis.delete(`session:${sessionId}:${userId}`),
        this.redis.delete(`invoice:${invoiceNumber}:${userId}`),
        this.audit.record('SESSION_SUBMITTED', { sessionId, userId, ...response }),
      ]);
      return response;
    });
  }
  
  async cancel(sessionId: string, userId: string) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const session = await this.ownedActive(sessionId, userId);
      session.status = ScanSessionStatus.CANCELLED;
      await this.sessions.saveSession(session);
      await this.histories.saveHistory({
        invoiceId: session.invoiceId,
        invoiceNumber: session.invoiceNumber,
        sessionId,
        userId,
        status: InvoiceHistoryStatus.CANCELLED,
        pointsAwarded: 0,
      });
      await this.redis.delete(`session:${sessionId}:${userId}`);
      await this.audit.record('SESSION_CANCELLED', { sessionId, userId });
      return { sessionId, status: session.status };
    });
  }

  async pairs(sessionId: string, userId: string, page = 1, limit = 100) {
    await this.ownedActive(sessionId, userId, false);
    const { items, total } = await this.pairHistory.findPageBySession(
      sessionId,
      userId,
      page,
      limit
    );
    return { items, total, page, limit };
  }
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly validation: InvoiceValidationService,
    private readonly scanSessions: ScanSessionService,
    private readonly histories: InvoiceHistoryRepository,
    private readonly pairHistories: PairHistoryRepository
  ) {}

  validate(invoiceNumber: string, userId: string) {
    return this.validation.validate(invoiceNumber, userId);
  }
  start(invoiceNumber: string, userId: string) {
    return this.scanSessions.start(invoiceNumber, userId);
  }
  scan(sessionId: string, userId: string, pairUid: string) {
    return this.scanSessions.scan(sessionId, userId, pairUid);
  }
  bulkScan(sessionId: string, userId: string, pairUids: string[]) {
    return this.scanSessions.bulkScan(sessionId, userId, pairUids);
  }
  progress(sessionId: string, userId: string) {
    return this.scanSessions.get(sessionId, userId);
  }
  submit(sessionId: string, userId: string) {
    return this.scanSessions.submit(sessionId, userId);
  }
  cancel(sessionId: string, userId: string) {
    return this.scanSessions.cancel(sessionId, userId);
  }
  pairs(sessionId: string, userId: string, page?: number, limit?: number) {
    return this.scanSessions.pairs(sessionId, userId, page, limit);
  }

  removePair(sessionId: string, userId: string, pairUid: string) {
    return this.scanSessions.removePair(sessionId, userId, pairUid);
  }

  removeAllPairs(sessionId: string, userId: string) {
    return this.scanSessions.removeAllPairs(sessionId, userId);
  }

  async history(userId: string, query: InvoiceHistoryQueryDto) {
    const { items, total } = await this.histories.findHistory(userId, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  async historyDetail(id: string, userId: string) {
    const history = await this.histories.findOwnedById(id, userId);
    if (!history) throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    const pairs = await this.pairHistories.findBySession(history.sessionId, userId);
    return {
      invoice: history,
      scannedPairs: pairs,
      points: history.pointsAwarded,
      status: history.status,
    };
  }
}
