import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { InvoicePairRepository, InvoiceRepository, InvoiceSessionRepository } from '../repository';
import { InvoiceScanSessionEntity } from '../entities/invoice-scan-session.entity';
import { InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { ScanProgressResponseDto, ScannedPairItemDto } from '../dto';
import { RedisLockService } from './redis-lock.service';
import { InvoiceValidationService } from './invoice-validation.service';

const CACHE_TTL_SECONDS = 30 * 60;

@Injectable()
export class ScanSessionService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly sessionRepository: InvoiceSessionRepository,
    private readonly invoicePairRepository: InvoicePairRepository,
    private readonly validationService: InvoiceValidationService,
    private readonly lock: RedisLockService,
    private readonly redis: RedisService
  ) {}

  async buildProgressSummary(
    session: InvoiceScanSessionEntity,
    includePairList = true
  ): Promise<ScanProgressResponseDto> {
    const invoice = session.invoice?.id
      ? await this.invoiceRepository.findOne({ id: Number(session.invoice.id) })
      : null;

    const totalPairs = invoice?.total_pairs ?? session.expectedPairs;
    let scannedPairs = invoice?.scanned_pairs ?? session.scannedPairs;
    let scannedPairList: ScannedPairItemDto[] = [];

    if (session.invoice?.id) {
      const scannedRows = await this.invoicePairRepository
        .createQueryBuilder('pair')
        .innerJoinAndSelect('pair.assortment', 'assortment')
        .leftJoinAndSelect('assortment.item', 'item')
        .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoice.id })
        .andWhere('pair.status IN (:...statuses)', {
          statuses: [
            InvoicePairScanStatus.SCANNED,
            InvoicePairScanStatus.REDEEMED,
            InvoicePairScanStatus.USED,
            InvoicePairScanStatus.STOCKED,
          ],
        })
        .getMany();

      scannedPairs = Math.max(scannedPairs, scannedRows.length);

      if (includePairList) {
        scannedPairList = scannedRows.map((p) => ({
          pairCode: p?.pair_qr,
          pairUid: p?.pair_uid,
          subItemCode: p?.sub_item_code || p?.assortment?.packing_item_code,
          itemCode: p?.assortment?.item?.item_code || p?.assortment?.parent_item_code || undefined,
          itemName: p?.assortment?.item?.item_name || undefined,
          scannedAt: p?.scanned_at || new Date(),
        }));
      }
    }

    const remainingPairs = Math.max(0, totalPairs - scannedPairs);
    const totalPoints = invoice?.allocated_points ?? 0;
    const estimatedPoints =
      totalPairs > 0 ? Math.floor((totalPoints * scannedPairs) / totalPairs) : 0;

    return {
      sessionId: session.sessionId,
      totalPairs,
      scannedPairs,
      remainingPairs,
      estimatedPoints,
      totalPoints,
      status: session.status,
      invalid: session.invalidPairs,
      scannedPairList,
    };
  }

  async startSession(invoiceIdOrNumber: string, userId: string): Promise<ScanProgressResponseDto> {
    if (!invoiceIdOrNumber) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    }

    const invoice = await this.validationService.findInvoice(invoiceIdOrNumber);

    if (!invoice) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    }

    // Verify invoice belongs to req.user.id
    if (!invoice.user || String(invoice.user.id) !== String(userId)) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    }

    // If invoice is submitted / completed / fully scanned, no new session can be generated
    if (
      invoice.status === InvoiceStatus.COMPLETED ||
      invoice.scan_status === InvoiceScanStatus.FULLY_SCANNED ||
      invoice.scan_status === InvoiceScanStatus.SCANNED
    ) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_ALREADY_SCANNED);
    }

    return this.lock.withLock(`lock:invoice:${invoice.id}:${userId}`, async () => {
      const existing = await this.sessionRepository.findActive(String(invoice.id), userId);

      if (existing) {
        return this.buildProgressSummary(existing);
      }

      // Check if invoice has active in-progress session with another user
      if (invoice.scan_status === InvoiceScanStatus.IN_PROGRESS) {
        const otherSession = await this.sessionRepository.findOne({
          invoice: { id: Number(invoice.id) },
          status: ScanSessionStatus.ACTIVE,
        });

        if (otherSession && String(otherSession.user?.id) !== String(userId)) {
          throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_IN_PROGRESS_OTHER_USER);
        }
      }

      // Create InvoiceScanSession record
      const session = await this.sessionRepository.createSession({
        sessionId: randomUUID(),
        invoice: { id: Number(invoice.id) } as any,
        invoiceNumber: invoice.invoice_no,
        user: { id: Number(userId) } as any,
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
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
    }

    return this.buildProgressSummary(session);
  }

  async cancelSession(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findOwned(sessionId, userId);

    if (!session) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
    }

    if (session.status != ScanSessionStatus.ACTIVE) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
    }

    const invoice = session.invoice?.id
      ? await this.invoiceRepository.findOne({ id: Number(session.invoice.id) })
      : null;

    if (
      invoice &&
      (invoice.status === InvoiceStatus.COMPLETED ||
        invoice.scan_status === InvoiceScanStatus.FULLY_SCANNED ||
        invoice.scan_status === InvoiceScanStatus.SCANNED)
    ) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_ALREADY_SCANNED);
    }

    if (session.invoice?.scan_status != InvoiceScanStatus.IN_PROGRESS) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
    }

    session.status = ScanSessionStatus.CANCELLED;
    await this.sessionRepository.saveSession(session);

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
