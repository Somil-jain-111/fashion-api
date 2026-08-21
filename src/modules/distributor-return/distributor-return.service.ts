import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from 'src/default/databases/transaction';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoiceEntity } from 'src/modules/invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from 'src/modules/invoices/entities/invoice-pair-detail.entity';
import { InvoicePairScanStatus } from 'src/modules/invoices/enum/invoice-pair-scan-status.enum';
import { InvoiceScanStatus } from 'src/modules/invoices/enum/invoice.enum';
import { DistributorReturnRepository } from './repository/distributor-return.repository';
import { ProcessReturnDto, ValidateReturnDto } from './dto';

@Injectable()
export class DistributorReturnService {
  constructor(
    private readonly repository: DistributorReturnRepository,
    private readonly transactionService: TransactionService
  ) {}

  async validate(distributorId: string, dto: ValidateReturnDto) {
    const { invoice, pair } = await this.loadReturnable(
      distributorId,
      dto.invoiceNumber,
      dto.pairCode
    );
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
          dto.invoiceNumber,
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
            invoice_id: invoice.id,
            pair_id: pair.id,
            pair_uid: pair.pair_uid,
            retailer_id: String(invoice.user.id),
            distributor_id: distributorId,
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
    return { items, total, page, limit };
  }

  private async loadReturnable(
    distributorId: string,
    invoiceNumber: string,
    pairCode: string,
    manager?: EntityManager,
    forUpdate = false
  ): Promise<{ invoice: InvoiceEntity; pair: InvoicePairDetailEntity }> {
    const distributor = await this.repository.findDistributor(distributorId);
    if (!distributor?.code) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_FOUND);
    }

    const invoice = await this.repository.findInvoiceForDistributor(
      invoiceNumber,
      distributor.code,
      manager,
      forUpdate
    );
    if (!invoice) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_FOUND);
    }
    if (!invoice.user) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.RETAILER_NOT_FOUND);
    }

    const pair = await this.repository.findPairInInvoice(invoice.id, pairCode, manager);
    if (!pair) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_NOT_FOUND);
    }
    if (pair.status !== InvoicePairScanStatus.REDEEMED) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_NOT_ELIGIBLE);
    }

    const existingReturn = await this.repository.findExistingReturn(pair.id, manager);
    if (existingReturn) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.PAIR_ALREADY_RETURNED);
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
