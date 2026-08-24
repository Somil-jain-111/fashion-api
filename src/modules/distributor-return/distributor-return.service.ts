import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from 'src/default/databases/transaction';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoiceEntity } from 'src/modules/invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from 'src/modules/invoices/entities/invoice-pair-detail.entity';
import { InvoicePairScanStatus } from 'src/modules/invoices/enum/invoice-pair-scan-status.enum';
import { InvoiceScanStatus, InvoiceStatus } from 'src/modules/invoices/enum/invoice.enum';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { DistributorReturnRepository } from './repository/distributor-return.repository';
import { ProcessReturnDto, ValidateReturnDto } from './dto';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationEventType } from 'src/modules/notifications/enum/notification-event-type.enum';

interface ResolvedPair {
  pairCode: string;
  invoice: InvoiceEntity;
  pair: InvoicePairDetailEntity;
  product: { sku: string; name: string } | null;
}

interface FailedPair {
  pairCode: string;
  errorCode: string;
  message: string;
  data: unknown;
}

@Injectable()
export class DistributorReturnService {
  constructor(
    private readonly repository: DistributorReturnRepository,
    private readonly transactionService: TransactionService,
    private readonly notifications: NotificationsService
  ) {}

  async validate(distributorId: string, dto: ValidateReturnDto) {
    const pairCodes = this.dedupe(dto.pairCodes);
    const resolved: ResolvedPair[] = [];
    const failed: FailedPair[] = [];

    for (const pairCode of pairCodes) {
      try {
        resolved.push(await this.loadReturnable(distributorId, pairCode));
      } catch (error) {
        failed.push(this.toFailedPair(pairCode, error));
      }
    }

    const items = resolved.map((entry) => ({
      pairCode: entry.pairCode,
      invoiceNumber: entry.invoice.invoice_no,
      pairUid: entry.pair.pair_uid,
      pairQr: entry.pair.pair_qr,
      retailer: {
        id: String(entry.invoice.user.id),
        name: entry.invoice.user.firmName || entry.invoice.user.username || entry.invoice.party_name,
        mobile: entry.invoice.user.mobile,
      },
      estimatedRefundPoints: this.calculateRefundPoints(entry.invoice),
    }));

    return {
      items,
      failed,
      invoiceGroups: this.summarizeByInvoice(resolved),
      summary: { total: pairCodes.length, valid: resolved.length, invalid: failed.length },
    };
  }

  async process(distributorId: string, dto: ProcessReturnDto) {
    const tag = 'DistributorReturnService.process';
    const pairCodes = this.dedupe(dto.pairCodes);
    ConsoleLogger.log('DISTRIBUTOR_RETURN_START', { tag, data: { distributorId, pairCodes } });

    try {
      const result = await this.transactionService.execute(async (manager) => {
        const resolved: ResolvedPair[] = [];
        const failed: FailedPair[] = [];

        for (const pairCode of pairCodes) {
          try {
            resolved.push(await this.loadReturnable(distributorId, pairCode, manager, true));
          } catch (error) {
            failed.push(this.toFailedPair(pairCode, error));
          }
        }

        const groups = this.groupByInvoice(resolved);
        const retailerBalances = new Map<string, number>();
        const processed: Array<{
          returnNo: string;
          invoiceNumber: string;
          retailerId: string;
          pairsReturned: string[];
          pointsRefunded: number;
          retailerRemainingPoints: number;
        }> = [];

        for (const group of groups) {
          const { invoice, entries } = group;
          const retailerId = String(invoice.user.id);
          const refundPerPair = this.calculateRefundPoints(invoice);
          const totalRefund = refundPerPair * entries.length;

          const currentBalance = retailerBalances.has(retailerId)
            ? retailerBalances.get(retailerId)!
            : Number(invoice.user.points || 0);
          // A retailer may have already spent points earned from these pairs elsewhere —
          // clamp the wallet debit to what's actually available so the DB's
          // `CHECK(points >= 0)` never trips, while invoice.earned_points still reflects the
          // full nominal refund.
          const deduction = Math.min(totalRefund, currentBalance);
          const newBalance = currentBalance - deduction;
          retailerBalances.set(retailerId, newBalance);

          await this.repository.updateRetailerPoints(retailerId, BigInt(newBalance), manager);

          const returnNo = await this.generateUniqueReturnNo(manager);

          await this.repository.savePointHistory(
            {
              retailerId,
              points: deduction,
              balance: newBalance,
              transactionId: `return:${invoice.id}:${returnNo}`,
              description: `Points reversed for ${entries.length} returned pair(s) (invoice ${invoice.invoice_no})`,
            },
            manager
          );

          await this.applyInvoiceReturn(invoice, totalRefund, entries.length, manager);

          await this.repository.saveReturn(
            {
              return_no: returnNo,
              invoice,
              retailer: invoice.user,
              distributor: { id: Number(distributorId) },
              total_pairs: entries.length,
              total_points_refunded: deduction,
              remarks: dto.remarks,
              details: entries.map((entry) => ({
                pair: entry.pair,
                pair_uid: entry.pair.pair_uid,
                points_refunded: refundPerPair,
              })),
            },
            manager
          );

          processed.push({
            returnNo,
            invoiceNumber: invoice.invoice_no,
            retailerId,
            pairsReturned: entries.map((entry) => entry.pair.pair_uid),
            pointsRefunded: deduction,
            retailerRemainingPoints: newBalance,
          });
        }

        return { processed, failed };
      });

      ConsoleLogger.log('DISTRIBUTOR_RETURN_SUCCESS', { tag, data: result });

      for (const entry of result.processed) {
        await this.notifications.notify(
          entry.retailerId,
          NotificationEventType.PRODUCT_RETURNED,
          { returnNo: entry.returnNo, points: entry.pointsRefunded, invoiceNumber: entry.invoiceNumber },
          { type: 'distributor_return', id: entry.returnNo }
        );
      }

      return result;
    } catch (error) {
      ConsoleLogger.error('DISTRIBUTOR_RETURN_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  async history(distributorId: string, page: number, limit: number, search?: string) {
    const { items, total, totalArticles } = await this.repository.findHistoryForDistributor(
      distributorId,
      page,
      limit,
      undefined,
      search
    );
    return {
      items: items.map((item) => this.toHistoryResponse(item)),
      totalArticles,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  /**
   * "Retailer-wise return" — same shape as `history`, scoped to one retailer's returns only.
   */
  async retailerReturns(distributorId: string, retailerId: string, page: number, limit: number) {
    const { items, total, totalArticles } = await this.repository.findHistoryForDistributor(
      distributorId,
      page,
      limit,
      retailerId
    );
    return {
      items: items.map((item) => this.toHistoryResponse(item)),
      totalArticles,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  /**
   * Single return's full detail, matching the "Return Summary" screen — itemized product list
   * (per physical pair) with its estimated retail value, plus retailer info.
   */
  async returnDetail(distributorId: string, id: string) {
    const item = await this.repository.findReturnDetail(id, distributorId);
    if (!item) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.RETURN_NOT_FOUND);
    }

    const products = (item.details ?? []).map((detail: any) => {
      const price = Number(detail.pair?.assortment?.item?.mrp ?? 0);
      return {
        pairUid: detail.pair_uid,
        pointsRefunded: detail.points_refunded,
        productName: detail.pair?.assortment?.item?.item_name ?? null,
        productCode: detail.pair?.assortment?.item?.item_code ?? null,
        sizeCode: detail.pair?.assortment?.packing_item_code ?? null,
        price,
      };
    });
    const estimatedValue = products.reduce((sum, product) => sum + product.price, 0);

    return {
      id: item.id,
      returnNo: item.return_no,
      totalArticles: item.total_pairs,
      totalPointsRefunded: item.total_points_refunded,
      estimatedValue,
      remarks: item.remarks,
      createdAt: item.created_at,
      invoice: {
        id: item.invoice?.id,
        invoiceNumber: item.invoice?.invoice_no,
        partyName: item.invoice?.party_name,
      },
      retailer: {
        id: item.retailer?.id,
        name: item.retailer?.firmName || item.retailer?.username,
        code: item.retailer?.code,
        mobile: item.retailer?.mobile,
        city: item.retailer?.storeInformation?.city ?? null,
        state: item.retailer?.storeInformation?.state ?? null,
      },
      products,
    };
  }

  /**
   * Retailers mapped to this distributor, each annotated with how many of their REDEEMED
   * pairs are currently eligible for return (not yet claimed by an existing return record).
   */
  async retailers(distributorId: string, page: number, limit: number, search?: string) {
    const distributor = await this.repository.findDistributor(distributorId);
    if (!distributor?.code) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_FOUND);
    }

    const { rows, total } = await this.repository.findMappedRetailers(
      distributorId,
      page,
      limit,
      search
    );
    const retailerIds = rows.map((mapping) => Number(mapping.child.id));
    const articleCounts = await this.repository.countReturnableArticles(
      distributor.code,
      retailerIds
    );

    const items = rows.map((mapping) => {
      const retailer = mapping.child as any;
      return {
        id: String(retailer.id),
        name: retailer.firmName || retailer.username,
        code: retailer.code,
        mobile: retailer.mobile,
        city: retailer.storeInformation?.city ?? null,
        state: retailer.storeInformation?.state ?? null,
        totalArticles: articleCounts.get(Number(retailer.id)) ?? 0,
      };
    });

    return {
      items,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  private dedupe(pairCodes: string[]): string[] {
    return Array.from(new Set(pairCodes));
  }

  private toFailedPair(pairCode: string, error: unknown): FailedPair {
    if (error instanceof BusinessException) {
      const response = error.getResponse() as { errorCode: string; message: string; data: unknown };
      return { pairCode, errorCode: response.errorCode, message: response.message, data: response.data };
    }
    throw error;
  }

  private groupByInvoice(
    entries: ResolvedPair[]
  ): Array<{ invoice: InvoiceEntity; entries: ResolvedPair[] }> {
    const groups = new Map<string, { invoice: InvoiceEntity; entries: ResolvedPair[] }>();
    for (const entry of entries) {
      const key = String(entry.invoice.id);
      if (!groups.has(key)) {
        groups.set(key, { invoice: entry.invoice, entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    }
    return Array.from(groups.values());
  }

  private summarizeByInvoice(entries: ResolvedPair[]) {
    return this.groupByInvoice(entries).map(({ invoice, entries: groupEntries }) => ({
      invoiceNumber: invoice.invoice_no,
      retailer: {
        id: String(invoice.user.id),
        name: invoice.user.firmName || invoice.user.username || invoice.party_name,
        mobile: invoice.user.mobile,
      },
      pairs: groupEntries.map((entry) => entry.pair.pair_uid),
      estimatedTotalRefund: this.calculateRefundPoints(invoice) * groupEntries.length,
    }));
  }

  private estimatedValueOf(item: any): number {
    return (item.details ?? []).reduce(
      (sum: number, detail: any) => sum + Number(detail.pair?.assortment?.item?.mrp ?? 0),
      0
    );
  }

  /**
   * One row per physical pair returned — merged, so a size returned twice appears as two rows
   * with the same product name/price. Used by `retailerHistory`'s list rows, which show a per-
   * order total rather than a breakdown.
   */
  private toHistoryResponse(item: any) {
    return {
      id: item.id,
      returnNo: item.return_no,
      totalPairs: item.total_pairs,
      totalPointsRefunded: item.total_points_refunded,
      estimatedValue: this.estimatedValueOf(item),
      remarks: item.remarks,
      createdAt: item.created_at,
      invoice: {
        id: item.invoice?.id,
        invoiceNumber: item.invoice?.invoice_no,
        partyName: item.invoice?.party_name,
        invoiceDate: item.invoice?.invoice_date,
      },
      retailer: {
        id: item.retailer?.id,
        name: item.retailer?.firmName || item.retailer?.username,
        code: item.retailer?.code,
        mobile: item.retailer?.mobile,
        city: item.retailer?.storeInformation?.city ?? null,
        state: item.retailer?.storeInformation?.state ?? null,
      },
      distributor: {
        id: item.distributor?.id,
        name: item.distributor?.firmName || item.distributor?.username,
        mobile: item.distributor?.mobile,
      },
      pairs: (item.details ?? []).map((detail: any) => ({
        pairUid: detail.pair_uid,
        pointsRefunded: detail.points_refunded,
      })),
    };
  }

  /**
   * One row per distinct product/size, quantities summed — matches the retailer "Order
   * Details" screen's grouped product list (e.g. "Qty: 5 x ₹1749"), unlike the distributor's
   * per-pair "Return Summary" product list.
   */
  private groupProducts(details: any[]) {
    const groups = new Map<
      string,
      { productName: string | null; productCode: string | null; sizeCode: string | null; price: number; quantity: number }
    >();
    for (const detail of details ?? []) {
      const item = detail.pair?.assortment?.item;
      const sizeCode = detail.pair?.assortment?.packing_item_code ?? null;
      const key = `${item?.id ?? 'unknown'}:${sizeCode}`;
      if (!groups.has(key)) {
        groups.set(key, {
          productName: item?.item_name ?? null,
          productCode: item?.item_code ?? null,
          sizeCode,
          price: Number(item?.mrp ?? 0),
          quantity: 0,
        });
      }
      groups.get(key)!.quantity += 1;
    }
    return Array.from(groups.values()).map((group) => ({
      ...group,
      total: group.price * group.quantity,
    }));
  }

  /**
   * Retailer's own return history across ALL distributors — the "Return History" screen.
   */
  async retailerHistory(
    retailerId: string,
    page: number,
    limit: number,
    search?: string,
    startDate?: string,
    endDate?: string
  ) {
    const { items, total, totalArticles } = await this.repository.findReturnsForRetailer(
      retailerId,
      page,
      limit,
      search,
      startDate,
      endDate
    );
    return {
      items: items.map((item) => this.toHistoryResponse(item)),
      totalArticles,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  /**
   * Retailer's own single-return detail — the "Order Details" screen, with grouped
   * (not per-pair) product quantities.
   */
  async retailerReturnDetail(retailerId: string, id: string) {
    const item = await this.repository.findReturnDetailForRetailer(id, retailerId);
    if (!item) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.RETURN_NOT_FOUND);
    }

    return {
      id: item.id,
      returnNo: item.return_no,
      totalArticles: item.total_pairs,
      totalPointsRefunded: item.total_points_refunded,
      estimatedValue: this.estimatedValueOf(item),
      remarks: item.remarks,
      orderDate: item.invoice?.invoice_date,
      returnDate: item.created_at,
      invoice: {
        id: item.invoice?.id,
        invoiceNumber: item.invoice?.invoice_no,
        partyName: item.invoice?.party_name,
      },
      retailer: {
        id: item.retailer?.id,
        name: item.retailer?.firmName || item.retailer?.username,
        code: item.retailer?.code,
        mobile: item.retailer?.mobile,
      },
      distributor: {
        id: item.distributor?.id,
        name: item.distributor?.firmName || item.distributor?.username,
        mobile: item.distributor?.mobile,
      },
      returnedProducts: this.groupProducts(item.details as any[]),
    };
  }

  private async loadReturnable(
    distributorId: string,
    pairCode: string,
    manager?: EntityManager,
    forUpdate = false
  ): Promise<ResolvedPair> {
    const distributor = await this.repository.findDistributor(distributorId);
    if (!distributor?.code) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_FOUND, undefined, {
        reasonCode: 'DISTRIBUTOR_NOT_LINKED',
        reasonLabel: 'Invoice Not Found',
      });
    }

    // The invoice is derived from the scanned pair (via its assortment) rather than taken
    // as separate input — the pair itself is the only thing the distributor scans now.
    const pair = await this.repository.findPairByCode(pairCode, manager);
    if (!pair) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_NOT_FOUND, undefined, {
        reasonCode: 'PAIR_NOT_FOUND',
        reasonLabel: 'Pair Not Found',
        pairCode,
      });
    }

    // Every failure from here on has a resolved physical pair — attach product context
    // (name/SKU) to whatever error gets thrown below, matching the scan-failure UI's card.
    const product = await this.repository.findProductForPair(
      String(pair.assortment.invoice.id),
      pair.assortment.parent_item_code,
      manager
    );
    const failureContext = (
      reasonCode: string,
      reasonLabel: string,
      extra?: Record<string, unknown>
    ) => ({
      reasonCode,
      reasonLabel,
      pair: { pairUid: pair.pair_uid, pairQr: pair.pair_qr },
      product: product ? { sku: product.item_code, name: product.item_name } : null,
      ...extra,
    });

    const invoice = await this.repository.findInvoiceById(
      String(pair.assortment.invoice.id),
      manager,
      forUpdate
    );
    // Not found, or found but belonging to a different distributor (master_id mismatch) —
    // either way this distributor doesn't own the invoice this pair came from.
    if (!invoice || invoice.master_id !== distributor.code) {
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_FOUND,
        undefined,
        failureContext('INVOICE_MISMATCH', 'Invoice Mismatch')
      );
    }
    // Returns reverse points that were only ever earned off an APPROVED invoice's scans —
    // an invoice still PENDING/REJECTED/CANCELLED has no rewarded pairs to reverse.
    if (invoice.status !== InvoiceStatus.COMPLETED) {
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_APPROVED,
        undefined,
        failureContext('INVOICE_NOT_APPROVED', 'Invoice Not Approved')
      );
    }
    if (invoice.expires_at && new Date(invoice.expires_at).getTime() <= Date.now()) {
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_EXPIRED,
        undefined,
        failureContext('PERIOD_EXPIRED', 'Period Expired')
      );
    }
    if (!invoice.user) {
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.RETAILER_NOT_FOUND,
        undefined,
        failureContext('RETAILER_NOT_FOUND', 'Retailer Not Found')
      );
    }
    if (pair.status !== InvoicePairScanStatus.REDEEMED) {
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_NOT_ELIGIBLE,
        undefined,
        failureContext('PAIR_NOT_ELIGIBLE', 'Not Yet Redeemed')
      );
    }

    const existingReturn = await this.repository.findExistingReturnForPair(String(pair.id), manager);
    if (existingReturn) {
      const minutesAgo = Math.max(
        0,
        Math.round((Date.now() - new Date(existingReturn.return.created_at).getTime()) / 60000)
      );
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_ALREADY_RETURNED,
        undefined,
        failureContext('ALREADY_RETURNED', 'Already Returned', {
          previousReturn: {
            returnId: String(existingReturn.return.id),
            returnedAt: existingReturn.return.created_at,
            minutesAgo,
          },
        })
      );
    }

    return { pairCode, invoice, pair, product: product ? { sku: product.item_code, name: product.item_name } : null };
  }

  // Per-pair earn isn't stored individually on invoice_pair_details — only the invoice-level
  // allocated_points/total_pairs pool is. The average per-pair value is the same divisor
  // PointCalculationService.calculate uses going forward, so it's used symmetrically in reverse.
  private calculateRefundPoints(invoice: InvoiceEntity): number {
    if (invoice.total_pairs <= 0) {
      return 0;
    }
    return Math.floor(invoice.allocated_points / invoice.total_pairs);
  }

  private async applyInvoiceReturn(
    invoice: InvoiceEntity,
    refundPoints: number,
    pairCount: number,
    manager: EntityManager
  ): Promise<void> {
    invoice.earned_points = Math.max(0, invoice.earned_points - refundPoints);
    invoice.scanned_pairs = Math.max(0, invoice.scanned_pairs - pairCount);
    invoice.scan_status =
      invoice.scanned_pairs <= 0
        ? InvoiceScanStatus.NOT_SCANNED
        : invoice.scanned_pairs < invoice.total_pairs
          ? InvoiceScanStatus.PARTIALLY_SCANNED
          : InvoiceScanStatus.FULLY_SCANNED;
    await this.repository.saveInvoice(invoice, manager);
  }

  private async generateUniqueReturnNo(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `RTN-CAMPUS-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const existing = await this.repository.findExistingByReturnNo(candidate, manager);
      if (!existing) {
        return candidate;
      }
    }
    throw new BusinessException(ERROR_CODES.COMMON.SOMETHING_WENT_WRONG);
  }
}
