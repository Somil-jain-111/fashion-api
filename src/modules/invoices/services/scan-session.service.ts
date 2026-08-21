import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { InvoiceRepository, InvoiceSessionRepository, PairHistoryRepository } from '../repository';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { InvoiceScanStatus } from '../enum/invoice.enum';
import { ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { ScanProgressResponseDto, ScannedPairItemDto } from '../dto';
import { RedisLockService } from './redis-lock.service';
import { InvoiceValidationService } from './invoice-validation.service';
import { DataSource } from 'typeorm';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';

const CACHE_TTL_SECONDS = 30 * 60;

@Injectable()
export class ScanSessionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly sessionRepository: InvoiceSessionRepository,
    private readonly pairHistoryRepository: PairHistoryRepository,
    private readonly validationService: InvoiceValidationService,
    private readonly lock: RedisLockService,
    private readonly redis: RedisService
  ) {}

  async buildProgressSummary(
    session: InvoiceScanSessionEntity,
    includePairList = true
  ): Promise<ScanProgressResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      id: Number(session.invoiceId),
    });

    const totalPairs = invoice?.total_pairs ?? session.expectedPairs;
    const scannedPairs = session.scannedPairs;
    const remainingPairs = Math.max(0, totalPairs - scannedPairs);
    const totalPoints = invoice?.allocated_points ?? 0;
    const estimatedPoints =
      totalPairs > 0 ? Math.floor((totalPoints * scannedPairs) / totalPairs) : 0;

    let scannedPairList: ScannedPairItemDto[] = [];
    if (includePairList) {
      const scannedRows = await this.dataSource
        .getRepository(InvoicePairDetailEntity)
        .createQueryBuilder('pair')
        .innerJoin('pair.assortment', 'assortment')
        .select([
          'pair.pair_qr',
          'pair.pair_uid',
          'pair.sub_item_code',
          'pair.scanned_at',
          'assortment.packing_item_code',
        ])
        .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoiceId })
        .andWhere('pair.session_id = :sessionId', { sessionId: session.sessionId })
        .getMany();

      scannedPairList = scannedRows.map((p) => ({
        pairCode: p.pair_qr,
        pairUid: p.pair_uid,
        subItemCode: p.sub_item_code || p.assortment?.packing_item_code,
        scannedAt: p.scanned_at || new Date(),
      }));
    }

    return {
      sessionId: session.sessionId,
      totalPairs,
      scannedPairs,
      remainingPairs,
      estimatedPoints,
      totalPoints,
      status: session.status,
      scannedPairList,
      progress: scannedPairs,
      expected: totalPairs,
      valid: session.validPairs,
      invalid: session.invalidPairs,
    };
  }

  async startSession(invoiceIdOrNumber: string, userId: string): Promise<ScanProgressResponseDto> {
    if (!invoiceIdOrNumber) {
      throw new BadRequestException('invoiceId or invoiceNumber is required');
    }

    const invoice = await this.validationService.findInvoice(invoiceIdOrNumber);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceIdOrNumber} not found`);
    }

    // Verify invoice belongs to req.user.id
    if (!invoice.user || String(invoice.user.id) !== String(userId)) {
      throw new BadRequestException('Invoice must be validated and claimed by the retailer first');
    }

    return this.lock.withLock(`lock:invoice:${invoice.id}:${userId}`, async () => {
      const existing = await this.sessionRepository.findActive(String(invoice.id), userId);
      if (existing) {
        return this.buildProgressSummary(existing);
      }

      // Check if invoice has active in-progress session with another user
      if (invoice.scan_status === InvoiceScanStatus.IN_PROGRESS) {
        const otherSession = await this.sessionRepository.findOne({
          invoiceId: String(invoice.id),
          status: ScanSessionStatus.ACTIVE,
        });
        if (otherSession && String(otherSession.userId) !== String(userId)) {
          throw new ConflictException(
            'Invoice is currently in an active scanning session by another user'
          );
        }
      }

      // Create InvoiceScanSession record
      const session = await this.sessionRepository.createSession({
        sessionId: randomUUID(),
        invoiceId: String(invoice.id),
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

      // Update invoice.scan_status = IN_PROGRESS
      invoice.scan_status = InvoiceScanStatus.IN_PROGRESS;
      await this.invoiceRepository.saveInvoice(invoice);

      const summary = await this.buildProgressSummary(session);
      await this.redis.set(`session:${session.sessionId}:${userId}`, summary, CACHE_TTL_SECONDS);
      return summary;
    });
  }

  async getSessionProgress(sessionId: string, userId: string): Promise<ScanProgressResponseDto> {
    const session = await this.sessionRepository.findOwned(sessionId, userId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return this.buildProgressSummary(session);
  }

  async cancelSession(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findOwned(sessionId, userId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    session.status = ScanSessionStatus.CANCELLED;
    await this.sessionRepository.saveSession(session);

    const invoice = await this.invoiceRepository.findOne({ id: Number(session.invoiceId) });
    if (invoice && invoice.scan_status === InvoiceScanStatus.IN_PROGRESS) {
      invoice.scan_status =
        invoice.scanned_pairs > 0
          ? InvoiceScanStatus.PARTIALLY_SCANNED
          : InvoiceScanStatus.NOT_SCANNED;
      await this.invoiceRepository.saveInvoice(invoice);
    }
    await this.redis.delete(`session:${sessionId}:${userId}`);
    return { sessionId, status: session.status };
  }

  start(invoiceIdOrNumber: string, userId: string) {
    return this.startSession(invoiceIdOrNumber, userId);
  }

  get(sessionId: string, userId: string) {
    return this.getSessionProgress(sessionId, userId);
  }

  cancel(sessionId: string, userId: string) {
    return this.cancelSession(sessionId, userId);
  }
}
