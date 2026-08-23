import { Injectable } from '@nestjs/common';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoicePairRepository } from '../invoices/repository';
import { InvoicePairScanStatus } from '../invoices/enum/invoice-pair-scan-status.enum';
import { CustomerReturnRepository } from './repository/customer-return.repository';
import {
  CustomerReturnHistoryQueryDto,
  SubmitCustomerReturnDto,
  ValidateCustomerReturnPairDto,
} from './dto';
import { InvoiceScanStatus, InvoiceStatus } from '../invoices/enum/invoice.enum';

@Injectable()
export class CustomerReturnService {
  constructor(
    private readonly repository: CustomerReturnRepository,
    private readonly pairRepository: InvoicePairRepository
  ) {}

  /**
   * Helper returns formatted response object
   */
  private toResponse(item: any) {
    return {
      id: String(item?.id),
      pairUid: item?.pair_uid,
      issueType: item?.issue_type,
      remarks: item?.remarks,
      photoUrl: item?.photo_url,
      createdAt: item?.createdAt,
      updatedAt: item?.updatedAt,
      invoiceNumber: item?.invoice?.invoice_no,
      itemCode: item?.invoiceItem?.item_code || null,
      itemName: item?.invoiceItem?.item_name || null,
    };
  }

  /**
   * Validates if pair UID belongs to a completed scan invoice of the same retailer
   */
  async validatePair(retailerId: string | number, dto: ValidateCustomerReturnPairDto) {
    const pairCodeTrimmed = dto.pairUid.trim();

    // Check if pair has already been returned
    const existingReturn = await this.repository.findByPairUid(pairCodeTrimmed);

    if (existingReturn) {
      throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_ALREADY_RETURNED);
    }

    const pair = await this.pairRepository.findByPairUidOrQr(pairCodeTrimmed);

    if (!pair) {
      throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_FOUND);
    }

    // Verify scanned by retailer
    const isScannedStatus =
      pair.status === InvoicePairScanStatus.SCANNED ||
      pair.status === InvoicePairScanStatus.REDEEMED ||
      pair.status === InvoicePairScanStatus.USED ||
      pair.is_scanned;

    const scannedByRetailer =
      String(pair.scannedByUser?.id ?? '') === String(retailerId) ||
      String(pair.assortment?.invoice?.user?.id ?? '') === String(retailerId);

    if (!isScannedStatus || !scannedByRetailer) {
      throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_SCANNED_BY_RETAILER);
    }

    // Verify invoice is completed/scanned
    const invoice = pair.assortment?.invoice;
    const isInvoiceCompleted =
      invoice &&
      (invoice.status === InvoiceStatus.COMPLETED ||
        invoice.scan_status === InvoiceScanStatus.FULLY_SCANNED ||
        invoice.scan_status === InvoiceScanStatus.SCANNED);

    if (!isInvoiceCompleted) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_SCANNED);
    }

    return {
      isValid: true,
      pairUid: pair.pair_uid,
      invoiceNumber: invoice?.invoice_no,
      itemCode: pair.assortment?.item?.item_code || pair.assortment?.parent_item_code || null,
      itemName: pair.assortment?.item?.item_name || null,
    };
  }

  /**
   * Submits a customer return entry (pairUID, issue, remarks, photoUrl)
   */
  async submitReturn(retailerId: string | number, dto: SubmitCustomerReturnDto) {
    const validation = await this.validatePair(retailerId, { pairUid: dto.pairUid });

    if (!validation.isValid) {
      throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_SCANNED_BY_RETAILER);
    }

    const pairCodeTrimmed = dto.pairUid.trim();
    const pair = await this.pairRepository.findByPairUidOrQr(pairCodeTrimmed);

    console.log(pair);

    const saved = await this.repository.saveCustomerReturn({
      pair_uid: pair!.pair_uid,
      retailer: { id: Number(retailerId) } as any,
      invoice: pair?.assortment?.invoice ? ({ id: pair.assortment.invoice.id } as any) : null,
      invoiceItem: pair?.assortment?.item ? ({ id: pair.assortment.item.id } as any) : null,
      pair: pair ? ({ id: pair.id } as any) : null,
      remarks: dto.remarks?.trim() || null,
      photo_url: dto.photoUrl?.trim() || null,
    });

    ConsoleLogger.log('CUSTOMER_RETURN_SAVED', {
      tag: 'CustomerReturnService',
      data: { id: saved.id, pairUid: saved.pair_uid, retailerId },
    });

    const fullRecord = await this.repository.findDetailOwnedByRetailer(saved.id, retailerId);

    return this.toResponse(fullRecord || saved);
  }

  /**
   * Gets history of customer returns for a retailer
   */
  async getHistory(retailerId: string | number, query: CustomerReturnHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await this.repository.findHistoryByRetailer(retailerId, {
      page,
      limit,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: CommonUtils.generatePaginationResponse(total, page, limit),
    };
  }

  /**
   * Gets detail of a specific customer return record
   */
  async getHistoryDetail(retailerId: string | number, id: string) {
    const returnRecord = await this.repository.findDetailOwnedByRetailer(id, retailerId);

    if (!returnRecord) {
      throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    }

    return this.toResponse(returnRecord);
  }
}
