import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from 'src/default/databases/redis/redis.service';
import {
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
} from '../repository';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
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
    private readonly dataSource: DataSource,
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
      throw new BadRequestException('pairCode or pairUid must be provided');
    }

    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      // 1. Verify active session exists, belongs to req.user.id, and is IN_PROGRESS / ACTIVE
      const session = await this.sessionRepository.findOwned(sessionId, userId);

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      if (session.status !== ScanSessionStatus.ACTIVE) {
        throw new BadRequestException(`Session is not active (status: ${session.status})`);
      }

      // 2. Validate pairCode / pairUid against InvoicePairDetail records belonging to this invoice
      const pairRepo = this.dataSource.getRepository(InvoicePairDetailEntity);
      const pair = await pairRepo
        .createQueryBuilder('pair')
        .innerJoinAndSelect('pair.assortment', 'assortment')
        .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoiceId })
        .andWhere('(pair.pair_uid = :val OR pair.pair_qr = :val)', { val: pairCodeOrUid.trim() })
        .getOne();

      if (!pair) {
        throw new NotFoundException(`Pair ${pairCodeOrUid} does not belong to this invoice`);
      }

      // 3. Check if pair is already scanned in DB
      if (
        pair.status === InvoicePairScanStatus.SCANNED ||
        pair.status === InvoicePairScanStatus.REDEEMED ||
        pair.status === InvoicePairScanStatus.USED
      ) {
        throw new ConflictException(`Pair ${pairCodeOrUid} has already been scanned`);
      }

      // 4. Update pair scan status
      pair.status = InvoicePairScanStatus.SCANNED;
      pair.session_id = sessionId;
      pair.scanned_by = userId;
      pair.scanned_at = new Date();
      if (pair.assortment?.packing_item_code) {
        pair.sub_item_code = pair.assortment.packing_item_code;
      }
      await pairRepo.save(pair);

      // Record in pair history log
      await this.pairHistoryRepository.insertIgnore([
        {
          sessionId,
          invoiceId: session.invoiceId,
          pairUid: pair.pair_uid,
          userId,
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

      const invoice = await this.invoiceRepository.findOne({ id: Number(session.invoiceId) });
      if (invoice) {
        invoice.scanned_pairs = session.scannedPairs;
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
      throw new BadRequestException('pairCode or pairUid must be provided');
    }

    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      // 1. Verify active session belongs to req.user.id
      const session = await this.sessionRepository.findOwned(sessionId, userId);

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // 2. Find InvoicePairDetail associated with sessionId and pairCode (or pairUid)
      const pairRepo = this.dataSource.getRepository(InvoicePairDetailEntity);
      const pair = await pairRepo
        .createQueryBuilder('pair')
        .innerJoinAndSelect('pair.assortment', 'assortment')
        .where('assortment.invoice_id = :invoiceId', { invoiceId: session.invoiceId })
        .andWhere('pair.session_id = :sessionId', { sessionId })
        .andWhere('(pair.pair_uid = :val OR pair.pair_qr = :val)', { val: pairCodeOrUid.trim() })
        .getOne();

      if (!pair) {
        throw new NotFoundException(`Pair ${pairCodeOrUid} not found in current scanning session`);
      }

      // 3. Revert pair status (is_scanned = false, clear session_id and scanned_by_user_id)
      pair.status = InvoicePairScanStatus.UNSCANNED;
      pair.session_id = null as any;
      pair.scanned_by = null as any;
      pair.scanned_at = null as any;
      await pairRepo.save(pair);

      await this.pairHistoryRepository.deleteOneActive(sessionId, pair.pair_uid);

      // 4. Decrement scanned_pairs count and recalculate progress/estimated points
      const counts = await this.pairHistoryRepository.countBySession(sessionId);
      session.scannedPairs = counts.scanned;
      session.validPairs = counts.valid;
      session.invalidPairs = counts.invalid;
      await this.sessionRepository.saveSession(session);

      const invoice = await this.invoiceRepository.findOne({ id: Number(session.invoiceId) });

      if (invoice) {
        invoice.scanned_pairs = session.scannedPairs;
        await this.invoiceRepository.saveInvoice(invoice);
      }

      await this.redis.delete(`session:${sessionId}:${userId}`);
      // 5. Return updated session summary
      return this.scanSessionService.buildProgressSummary(session);
    });
  }
}
