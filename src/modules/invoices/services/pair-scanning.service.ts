import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import {
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
} from '../repository';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import {
  ScanSessionStatus,
  PairHistoryStatus,
  ScanSource,
} from '../enum/invoice-scan-session.enum';
import { ScanProgressResponseDto } from '../dto';
import { RedisLockService } from './redis-lock.service';
import { ScanSessionService } from './scan-session.service';

@Injectable()
export class PairScanningService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly sessionRepository: InvoiceSessionRepository,
    private readonly pairRepository: InvoicePairRepository,
    private readonly pairHistoryRepository: PairHistoryRepository,
    private readonly scanSessionService: ScanSessionService,
    private readonly lock: RedisLockService,
    private readonly redis: RedisService
  ) {}

  async scanPair(
    sessionId: string,
    pairCodeOrUid: string,
    userId: string
  ): Promise<ScanProgressResponseDto> {
    if (!pairCodeOrUid) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.PAIR_NOT_FOUND);
    }

    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      // 1. Verify active session exists, belongs to req.user.id, and is IN_PROGRESS / ACTIVE
      const session = await this.sessionRepository.findOwned(sessionId, userId);

      if (!session) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
      }

      if (session.status !== ScanSessionStatus.ACTIVE) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_ACTIVE);
      }

      // 2. Validate pairCode / pairUid against InvoicePairDetail records belonging to this invoice
      const pair = await this.pairRepository
        .createQueryBuilder('pair')
        .innerJoinAndSelect('pair.assortment', 'assortment')
        .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoice?.id })
        .andWhere('(pair.pair_uid = :val OR pair.pair_qr = :val)', { val: pairCodeOrUid.trim() })
        .getOne();

      if (!pair) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.PAIR_NOT_IN_INVOICE);
      }

      // 3. Check if pair is already scanned in DB
      if (pair.is_scanned) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.DUPLICATE_PAIR);
      }

      // 4. Update pair scan status
      pair.status = InvoicePairScanStatus.SCANNED;
      pair.session_id = sessionId;
      pair.scannedByUser = { id: Number(userId) } as any;
      pair.scanned_at = new Date();

      if (pair.assortment?.packing_item_code) {
        pair.sub_item_code = pair.assortment.packing_item_code;
      }

      await this.pairRepository.updateById(pair.id, pair);

      // Record in pair history log
      await this.pairHistoryRepository.insertIgnore([
        {
          sessionId,
          invoice: { id: Number(session.invoice?.id) } as any,
          pairUid: pair.pair_uid,
          user: { id: Number(userId) } as any,
          status: PairHistoryStatus.VALID,
          scanSource: ScanSource.SINGLE,
        },
      ]);

      // 5. Increment session / invoice scanned_pairs count
      const counts = await this.pairHistoryRepository.countBySession(sessionId);
      session.scannedPairs = counts.scanned;
      session.validPairs = counts.valid;
      session.invalidPairs = counts.invalid;
      session.lastScannedAt = new Date();

      await this.sessionRepository.saveSession(session);

      const invoice = session.invoice?.id
        ? await this.invoiceRepository.findOne({ id: Number(session.invoice.id) })
        : null;
      if (invoice) {
        const totalScannedForInvoice = await this.pairRepository
          .createQueryBuilder('pair')
          .innerJoin('pair.assortment', 'assortment')
          .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoice?.id })
          .andWhere('pair.status IN (:...statuses)', {
            statuses: [
              InvoicePairScanStatus.SCANNED,
              InvoicePairScanStatus.REDEEMED,
              InvoicePairScanStatus.USED,
              InvoicePairScanStatus.STOCKED,
            ],
          })
          .getCount();

        invoice.scanned_pairs = totalScannedForInvoice;
        await this.invoiceRepository.saveInvoice(invoice);
      }

      await this.redis.delete(`session:${sessionId}:${userId}`);
      return this.scanSessionService.buildProgressSummary(session);
    });
  }

  async removePair(
    sessionId: string,
    pairCodeOrUid: string,
    userId: string
  ): Promise<ScanProgressResponseDto> {
    if (!pairCodeOrUid) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.PAIR_NOT_FOUND);
    }

    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      // 1. Verify active session belongs to req.user.id
      const session = await this.sessionRepository.findOwned(sessionId, userId);

      if (!session) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.SESSION_NOT_FOUND);
      }

      // 2. Find InvoicePairDetail associated with sessionId and pairCode (or pairUid)
      const pair = await this.pairRepository
        .createQueryBuilder('pair')
        .innerJoinAndSelect('pair.assortment', 'assortment')
        .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoice?.id })
        .andWhere('(pair.pair_uid = :val OR pair.pair_qr = :val)', { val: pairCodeOrUid.trim() })
        .getOne();

      if (!pair) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.PAIR_NOT_IN_SESSION);
      }

      // 3. Revert pair status
      pair.status = InvoicePairScanStatus.UNSCANNED;
      pair.session_id = null as any;
      pair.scannedByUser = null as any;
      pair.scanned_at = null as any;

      await this.pairRepository.updateById(pair.id, pair);

      await this.pairHistoryRepository.deleteOneActive(sessionId, pair.pair_uid);

      // 4. Decrement scanned_pairs count and recalculate progress/estimated points
      const counts = await this.pairHistoryRepository.countBySession(sessionId);
      session.scannedPairs = counts.scanned;
      session.validPairs = counts.valid;
      session.invalidPairs = counts.invalid;
      await this.sessionRepository.saveSession(session);

      const invoice = session.invoice?.id
        ? await this.invoiceRepository.findOne({ id: Number(session.invoice.id) })
        : null;

      if (invoice) {
        const totalScannedForInvoice = await this.pairRepository
          .createQueryBuilder('pair')
          .innerJoin('pair.assortment', 'assortment')
          .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoice?.id })
          .andWhere('pair.status IN (:...statuses)', {
            statuses: [
              InvoicePairScanStatus.SCANNED,
              InvoicePairScanStatus.REDEEMED,
              InvoicePairScanStatus.USED,
              InvoicePairScanStatus.STOCKED,
            ],
          })
          .getCount();

        invoice.scanned_pairs = totalScannedForInvoice;
        await this.invoiceRepository.saveInvoice(invoice);
      }

      await this.redis.delete(`session:${sessionId}:${userId}`);
      // 5. Return updated session summary
      return this.scanSessionService.buildProgressSummary(session);
    });
  }
}
