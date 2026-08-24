import { Injectable } from '@nestjs/common';
import { TransactionService } from 'src/default/databases/transaction/transaction.service';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import {
  InvoiceHistoryRepository,
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
} from '../repository';
import { SubDistributorStockRepository } from '../repository/sub-distributor-stock.repository';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';
import { InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { InvoiceHistoryStatus, ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { RedisLockService } from './redis-lock.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationEventType } from 'src/modules/notifications/enum/notification-event-type.enum';

export interface StockItemDto {
  itemCode: string;
  itemName: string | null;
  quantityAdded: number;
  totalQuantity: number;
}

export interface StockSubmissionResultDto {
  invoiceId: string;
  submissionId: string;
  sessionId: string;
  totalPairs: number;
  scannedPairs: number;
  remainingPairs: number;
  status: string;
  stockAdded: StockItemDto[];
  distributor: {
    name: string;
    address: string;
    state: string;
    city: string;
  };
}

@Injectable()
export class SubDistributorStockSettlementService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly sessionRepository: InvoiceSessionRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly pairRepository: InvoicePairRepository,
    private readonly historyRepository: InvoiceHistoryRepository,
    private readonly stockRepository: SubDistributorStockRepository,
    private readonly lock: RedisLockService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService
  ) {}

  /**
   * Sub-distributor equivalent of RewardSettlementService.submitSession() — same
   * lock/transaction/finalize shape, but no points are awarded. Scanned pairs are marked
   * STOCKED (not REDEEMED) and grouped by SKU (assortment.packing_item_code) to credit the
   * sub-distributor's running stock ledger instead.
   */
  async submitSession(sessionId: string, userId: string): Promise<StockSubmissionResultDto> {
    return this.lock.withLock(`lock:session:${sessionId}`, async () => {
      let invoiceNo: string = '';

      const result = await this.transactionService.runInTransaction(async (queryRunner) => {
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

        const scannedPairs = await this.pairRepository.findScannedPairsWithSkuForInvoice(
          String(session.invoice.id),
          queryRunner
        );

        const scannedCount = Math.max(invoice.scanned_pairs, scannedPairs.length);

        // Group scanned pairs by exact size/SKU (packing_item_code) — "if item is same we
        // add in stock" — so a re-scan of the same SKU increments one row rather than
        // creating a duplicate.
        const bySku = new Map<
          string,
          { itemName: string | null; pairs: InvoicePairDetailEntity[] }
        >();
        for (const pair of scannedPairs) {
          const itemCode = pair.assortment?.packing_item_code;
          if (!itemCode) continue;
          const itemName = pair.assortment?.item?.item_name ?? null;
          const entry = bySku.get(itemCode) ?? { itemName, pairs: [] };
          entry.pairs.push(pair);
          if (!entry.itemName && itemName) entry.itemName = itemName;
          bySku.set(itemCode, entry);
        }

        const stockAdded: StockItemDto[] = [];
        const historyEntries: Parameters<SubDistributorStockRepository['saveStockHistory']>[0] =
          [];
        for (const [itemCode, { itemName, pairs }] of bySku) {
          const row = await this.stockRepository.incrementOrCreate(
            userId,
            itemCode,
            itemName,
            pairs.length,
            queryRunner
          );
          stockAdded.push({
            itemCode,
            itemName: row.item_name ?? null,
            quantityAdded: pairs.length,
            totalQuantity: row.quantity,
          });
          historyEntries.push({
            subDistributorId: userId,
            invoiceId: String(session.invoice.id),
            itemCode,
            itemName: row.item_name ?? null,
            quantityAdded: pairs.length,
            totalQuantityAfter: row.quantity,
            submissionId,
            pairs,
          });
        }
        await this.stockRepository.saveStockHistory(historyEntries, queryRunner);

        // Mark all scanned InvoicePairDetail items permanently as STOCKED with timestamp.
        if (scannedPairs.length > 0) {
          await this.pairRepository.markScannedAsStocked(
            scannedPairs.map((p) => p.id),
            userId,
            queryRunner
          );
        }

        // Update session status = COMPLETED
        session.status = ScanSessionStatus.COMPLETED;
        session.completedAt = new Date();
        await this.sessionRepository.saveSession(session, queryRunner);

        // Update invoice scan_status/status/submission_id — no points/earned_points change.
        invoice.scanned_pairs = scannedCount;
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
            pointsAwarded: 0,
            metadata: { submittedPairs: scannedCount, submissionId, stockAdded },
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
          status: session.status,
          stockAdded,
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

      return result;
    });
  }

  async listStock(subDistributorId: string, page: number, limit: number) {
    const { items, total } = await this.stockRepository.listForSubDistributor(
      subDistributorId,
      page,
      limit
    );

    return {
      items: items.map((row) => ({
        itemCode: row.item_code,
        itemName: row.item_name ?? null,
        quantity: row.quantity,
      })),
      pagination: CommonUtils.generatePaginationResponse(total, page, limit),
    };
  }

  async listStockHistory(subDistributorId: string, page: number, limit: number) {
    const { items, total } = await this.stockRepository.listStockHistory(
      subDistributorId,
      page,
      limit
    );

    return {
      items: items.map((row) => ({
        id: row.id,
        itemCode: row.item_code,
        itemName: row.item_name ?? null,
        quantityAdded: row.quantity_added,
        totalQuantityAfter: row.total_quantity_after,
        submissionId: row.submission_id,
        createdAt: row.created_at,
        invoice: {
          id: row.invoice?.id,
          invoiceNumber: row.invoice?.invoice_no,
        },
        pairs: (row.details ?? []).map((detail) => ({ pairUid: detail.pair_uid })),
      })),
      pagination: CommonUtils.generatePaginationResponse(total, page, limit),
    };
  }
}
