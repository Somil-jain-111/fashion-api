import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { User } from 'src/modules/auth/entities';
import { PointHistory } from 'src/modules/redemptions/entities/point-history.entity';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
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
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
} from '../repository';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { PairScanHistoryEntity } from '../entities/pair-scan-history.entity';
import { InvoiceScanAuditEntity } from '../entities/invoice-scan-audit.entity';
import { InvoiceEntity } from '../entities/invoice.entity';

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
    private readonly redis: RedisService
  ) {}

  async getValidInvoice(invoiceNumber: string, userId: string) {
    const cacheKey = `invoice:${invoiceNumber}:${userId}`;
    let invoice = await this.redis.get<InvoiceEntity>(cacheKey);
    if (!invoice) {
      invoice = await this.invoices.findOwnedByNumber(invoiceNumber, userId);
      if (invoice) await this.redis.set(cacheKey, invoice, CACHE_TTL_SECONDS);
    }
    if (!invoice) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    if (invoice.status !== InvoiceStatus.APPROVED)
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_INACTIVE);
    if (invoice.expires_at && new Date(invoice.expires_at).getTime() <= Date.now())
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_EXPIRED);
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
  async award(
    manager: EntityManager,
    userId: string,
    points: number,
    transactionId: string,
    description: string
  ): Promise<void> {
    if (points <= 0) return;
    await manager.getRepository(User).increment({ id: Number(userId) }, 'points', points);
    const user = await manager.getRepository(User).findOne({
      select: { id: true, points: true },
      where: { id: Number(userId) },
    });
    await manager.getRepository(PointHistory).save(
      manager.getRepository(PointHistory).create({
        user: { id: Number(userId) } as User,
        points,
        description,
        type: RedemptionType.EARN,
        status: PointStatusEnum.added,
        date: new Date(),
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        user_remaining_points: Number(user?.points ?? 0),
        transaction_id: transactionId,
      })
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
    private readonly lock: RedisLockService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly pointCalculation: PointCalculationService,
    private readonly rewardService: RewardService
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
    return this.lock.withLock(`lock:invoice:${invoiceNumber}`, async () => {
      const existing = await this.sessions.findActive(invoice.id, userId);
      if (existing) return this.progress(existing);
      const session = await this.sessions.save({
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
      await this.histories.save({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_no,
        sessionId: session.sessionId,
        userId,
        status: InvoiceHistoryStatus.STARTED,
        pointsAwarded: 0,
      });
      await this.redis.set(
        `session:${session.sessionId}`,
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

  async scan(sessionId: string, userId: string, pairUid: string) {
    const result = await this.bulkScan(sessionId, userId, [pairUid], ScanSource.SINGLE);
    if (result.duplicate.length)
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.DUPLICATE_PAIR);
    if (result.invalid.length) {
      const code =
        result.invalid[0].reason === 'PAIR_UNAVAILABLE'
          ? ERROR_CODES.INVOICE_SCAN.PAIR_UNAVAILABLE
          : ERROR_CODES.INVOICE_SCAN.PAIR_NOT_IN_INVOICE;
      throw new BusinessException(code);
    }
    return { status: 'SUCCESS', progress: result.progress, remaining: result.remaining };
  }

  async bulkScan(sessionId: string, userId: string, pairUids: string[], source = ScanSource.BULK) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const session = await this.ownedActive(sessionId, userId);
      const validation = await this.pairValidation.validateMany(session.invoiceId, pairUids);
      const rows = [
        ...validation.valid.map((pairUid) => ({
          sessionId,
          invoiceId: session.invoiceId,
          pairUid,
          userId,
          status: PairHistoryStatus.VALID,
          scanSource: source,
        })),
        ...validation.invalid.map(({ pairUid, reason }) => ({
          sessionId,
          invoiceId: session.invoiceId,
          pairUid,
          userId,
          status: PairHistoryStatus.INVALID,
          scanSource: source,
          failureReason: reason,
        })),
      ];
      if (rows.length) {
        await this.pairHistory
          .createQueryBuilder('history')
          .insert()
          .into(PairScanHistoryEntity)
          .values(rows)
          .orIgnore()
          .execute();
      }
      const counts = await this.pairHistory
        .createQueryBuilder('history')
        .select('COUNT(*)', 'scanned')
        .addSelect(
          'SUM(CASE WHEN history.status IN (:...validStatuses) THEN 1 ELSE 0 END)',
          'valid'
        )
        .addSelect('SUM(CASE WHEN history.status = :invalidStatus THEN 1 ELSE 0 END)', 'invalid')
        .where('history.session_id = :sessionId', { sessionId })
        .setParameters({
          validStatuses: [PairHistoryStatus.VALID, PairHistoryStatus.REWARDED],
          invalidStatus: PairHistoryStatus.INVALID,
        })
        .getRawOne();
      session.scannedPairs = Number(counts?.scanned ?? 0);
      session.validPairs = Number(counts?.valid ?? 0);
      session.invalidPairs = Number(counts?.invalid ?? 0);
      session.lastScannedAt = new Date();
      await this.sessions.getRepository().save(session);
      await this.redis.delete(`session:${sessionId}:${userId}`);
      await this.audit.record('PAIRS_SCANNED', {
        sessionId,
        userId,
        valid: validation.valid.length,
        invalid: validation.invalid.length,
        duplicate: validation.duplicate.length,
      });
      return {
        valid: validation.valid,
        invalid: validation.invalid,
        duplicate: validation.duplicate,
        progress: session.scannedPairs,
        remaining: Math.max(0, session.expectedPairs - session.validPairs),
      };
    });
  }

  async submit(sessionId: string, userId: string) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const response = await this.dataSource.transaction(async (manager) => {
        const session = await this.sessions.findOwned(sessionId, userId, manager, true);
        if (!session) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
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
        const invoice = await manager
          .getRepository(InvoiceEntity)
          .createQueryBuilder('invoice')
          .setLock('pessimistic_write')
          .where('invoice.id = :invoiceId', { invoiceId: session.invoiceId })
          .getOneOrFail();
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
        await manager
          .getRepository(PairScanHistoryEntity)
          .update({ id: In(pending.map((row) => row.id)) }, { status: PairHistoryStatus.REWARDED });
        invoice.scanned_pairs = newInvoiceValid;
        invoice.earned_points += points;
        invoice.scan_status =
          newInvoiceValid >= invoice.total_pairs
            ? InvoiceScanStatus.FULLY_SCANNED
            : InvoiceScanStatus.PARTIALLY_SCANNED;
        await manager.getRepository(InvoiceEntity).save(invoice);
        const completed = session.validPairs >= session.expectedPairs;
        if (completed) {
          session.status = ScanSessionStatus.COMPLETED;
          session.completedAt = new Date();
        }
        await manager.getRepository(InvoiceScanSessionEntity).save(session);
        const historyStatus = completed
          ? InvoiceHistoryStatus.COMPLETED
          : InvoiceHistoryStatus.PARTIALLY_SUBMITTED;
        await manager.getRepository(InvoiceScanAuditEntity).save(
          manager.getRepository(InvoiceScanAuditEntity).create({
            invoiceId: session.invoiceId,
            invoiceNumber: session.invoiceNumber,
            sessionId,
            userId,
            status: historyStatus,
            pointsAwarded: points,
            metadata: { submittedPairs: pending.length },
          })
        );
        return {
          pointsAwarded: points,
          validPairs: pending.length,
          invalidPairs: session.invalidPairs,
          remainingPairs: Math.max(0, session.expectedPairs - session.validPairs),
        };
      });
      await Promise.all([
        this.redis.delete(`session:${sessionId}:${userId}`),
        this.audit.record('SESSION_SUBMITTED', { sessionId, userId, ...response }),
      ]);
      return response;
    });
  }

  async cancel(sessionId: string, userId: string) {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      const session = await this.ownedActive(sessionId, userId);
      session.status = ScanSessionStatus.CANCELLED;
      await this.sessions.getRepository().save(session);
      await this.histories.save({
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
    const [items, total] = await this.pairHistory.getRepository().findAndCount({
      where: { sessionId, userId },
      select: ['id', 'pairUid', 'status', 'scanSource', 'failureReason', 'createdAt'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
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

  async history(userId: string, query: InvoiceHistoryQueryDto) {
    const qb = this.histories
      .createQueryBuilder('history')
      .where('history.user_id = :userId', { userId });
    if (query.invoiceNumber)
      qb.andWhere('history.invoice_number = :invoiceNumber', {
        invoiceNumber: query.invoiceNumber,
      });
    if (query.status) qb.andWhere('history.status = :status', { status: query.status });
    if (query.fromDate)
      qb.andWhere('history.created_at >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('history.created_at <= :toDate', { toDate: query.toDate });
    const [items, total] = await qb
      .orderBy('history.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async historyDetail(id: string, userId: string) {
    const history = await this.histories.findOne({ id, userId });
    if (!history) throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    const pairs = await this.pairHistories.findMany({
      where: { sessionId: history.sessionId, userId },
      order: { id: 'ASC' },
    });
    return {
      invoice: history,
      scannedPairs: pairs,
      points: history.pointsAwarded,
      status: history.status,
    };
  }
}
