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

@Injectable()
export class DistributorReturnService {
  constructor(
    private readonly repository: DistributorReturnRepository,
    private readonly transactionService: TransactionService
  ) {}

  async validate(distributorId: string, dto: ValidateReturnDto) {
    const { invoice, pair } = await this.loadReturnable(distributorId, dto.pairCode);
    return {
      invoiceNumber: invoice.invoice_no,
      pairUid: pair.pair_uid,
      pairQr: pair.pair_qr,
      retailer: {
        id: String(invoice.user.id),
        name: invoice.user.firmName || invoice.user.username || invoice.party_name,
        mobile: invoice.user.mobile,
      },
      estimatedRefundPoints: this.calculateRefundPoints(invoice),
    };
  }

  async process(distributorId: string, dto: ProcessReturnDto) {
    const tag = 'DistributorReturnService.process';
    ConsoleLogger.log('DISTRIBUTOR_RETURN_START', { tag, data: { distributorId, ...dto } });

    try {
      const result = await this.transactionService.execute(async (manager) => {
        const { invoice, pair } = await this.loadReturnable(
          distributorId,
          dto.pairCode,
          manager,
          true
        );

        const refundPoints = this.calculateRefundPoints(invoice);
        const currentBalance = Number(invoice.user.points || 0);
        // A retailer may have already spent points earned from this pair elsewhere — clamp
        // the wallet debit to what's actually available so the DB's `CHECK(points >= 0)`
        // never trips, while invoice.earned_points still reflects the full refundPoints.
        const deduction = Math.min(refundPoints, currentBalance);
        const newBalance = currentBalance - deduction;

        await this.repository.updateRetailerPoints(
          String(invoice.user.id),
          BigInt(newBalance),
          manager
        );
        await this.repository.savePointHistory(
          {
            retailerId: String(invoice.user.id),
            points: deduction,
            balance: newBalance,
            transactionId: `return:${invoice.id}:${pair.pair_uid}`,
            description: `Points reversed for returned pair ${pair.pair_uid} (invoice ${invoice.invoice_no})`,
          },
          manager
        );

        await this.applyInvoiceReturn(invoice, refundPoints, manager);

        await this.repository.saveReturn(
          {
            invoice: { id: Number(invoice.id) } as any,
            pair: { id: Number(pair.id) } as any,
            pair_uid: pair.pair_uid,
            retailer: { id: Number(invoice.user.id) } as any,
            distributor: { id: Number(distributorId) } as any,
            points_refunded: deduction,
            remarks: dto.remarks,
          },
          manager
        );

        return {
          invoiceNumber: invoice.invoice_no,
          pairUid: pair.pair_uid,
          retailerId: String(invoice.user.id),
          pointsRefunded: deduction,
          retailerRemainingPoints: newBalance,
        };
      });

      ConsoleLogger.log('DISTRIBUTOR_RETURN_SUCCESS', { tag, data: result });
      return result;
    } catch (error) {
      ConsoleLogger.error('DISTRIBUTOR_RETURN_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  async history(distributorId: string, page: number, limit: number) {
    const { items, total } = await this.repository.findHistoryForDistributor(
      distributorId,
      page,
      limit
    );
    return {
      items,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  private async loadReturnable(
    distributorId: string,
    pairCode: string,
    manager?: EntityManager,
    forUpdate = false
  ): Promise<{ invoice: InvoiceEntity; pair: InvoicePairDetailEntity }> {
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
    if (invoice.status !== InvoiceStatus.APPROVED) {
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

    const existingReturn = await this.repository.findExistingReturn(String(pair.id), manager);
    if (existingReturn) {
      const minutesAgo = Math.max(
        0,
        Math.round((Date.now() - new Date(existingReturn.createdAt).getTime()) / 60000)
      );
      throw new BusinessException(
        ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_ALREADY_RETURNED,
        undefined,
        failureContext('ALREADY_RETURNED', 'Already Returned', {
          previousReturn: {
            returnId: String(existingReturn.id),
            returnedAt: existingReturn.createdAt,
            minutesAgo,
          },
        })
      );
    }

    return { invoice, pair };
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
    manager: EntityManager
  ): Promise<void> {
    invoice.earned_points = Math.max(0, invoice.earned_points - refundPoints);
    invoice.scanned_pairs = Math.max(0, invoice.scanned_pairs - 1);
    invoice.scan_status =
      invoice.scanned_pairs <= 0
        ? InvoiceScanStatus.NOT_SCANNED
        : invoice.scanned_pairs < invoice.total_pairs
          ? InvoiceScanStatus.PARTIALLY_SCANNED
          : InvoiceScanStatus.FULLY_SCANNED;
    await this.repository.saveInvoice(invoice, manager);
  }
}
