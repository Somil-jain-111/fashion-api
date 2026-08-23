import { Injectable } from '@nestjs/common';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { TransactionService } from 'src/default/databases/transaction';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoicePairRepository } from '../invoices/repository';
import { InvoicePairScanStatus } from '../invoices/enum/invoice-pair-scan-status.enum';
import { CustomerReturnRepository } from './repository/customer-return.repository';
import { CustomerReturnIssueType, CustomerReturnStatus } from './enum/customer-return.enum';
import {
  CustomerReturnHistoryQueryDto,
  ScanCustomerReturnPairDto,
  UpdateCustomerReturnPairIssueDto,
} from './dto';
import { RedisLockService } from '../invoices/services/redis-lock.service';

@Injectable()
export class CustomerReturnService {
  constructor(
    private readonly repository: CustomerReturnRepository,
    private readonly pairRepository: InvoicePairRepository,
    private readonly lock: RedisLockService,
    private readonly transactionService: TransactionService
  ) {}

  /**
   * @Helper returns formatted response
   *
   * @param item
   * @returns
   */
  private toResponse(item: any) {
    return {
      id: String(item?.id),
      returnNumber: item?.return_number,
      totalPairs: item?.total_pairs ?? (item?.items?.length || 0),
      status: item?.status,
      remarks: item?.remarks,
      createdAt: item?.createdAt,
      updatedAt: item?.updatedAt,
      items: (item?.items || []).map((i: any) => ({
        id: String(i?.id),
        pairUid: i?.pair_uid,
        issueType: i?.issue_type,
        remarks: i?.remarks,
        itemCode: i?.item_code,
        subItemCode: i?.sub_item_code,
        invoiceNumber: i?.invoice?.invoice_no,
        createdAt: i?.createdAt,
      })),
    };
  }

  /**
   * Creates / Gets the active return entries
   *
   * @param retailerId
   * @returns
   */
  async getOrCreateActivePendingReturn(retailerId: string | number) {
    let pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);

    if (!pendingReturn) {
      pendingReturn = await this.repository.createPendingReturn(retailerId);
      pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);
    }

    return this.toResponse(pendingReturn!);
  }

  /**
   * Wrapper to call getOrCreateActivePendingReturn for backward compatibility
   *
   * @param retailerId
   * @returns
   */
  async getActiveReturn(retailerId: string | number) {
    return this.getOrCreateActivePendingReturn(retailerId);
  }

  /**
   * Scans a pair to be added in return
   *
   * @param retailerId
   * @param dto
   * @returns
   */
  async scanPair(retailerId: string | number, dto: ScanCustomerReturnPairDto) {
    const lockKey = `lock:customer-return:retailer:${retailerId}`;

    return this.lock.withLock(lockKey, async () => {
      if (dto.issueType === CustomerReturnIssueType.OTHER && !dto.remarks?.trim()) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.REMARKS_REQUIRED_FOR_OTHER);
      }

      let pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);

      if (!pendingReturn) {
        await this.repository.createPendingReturn(retailerId);
        pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);
      }

      const pairCodeTrimmed = dto.pairUid.trim();

      // Query InvoicePairDetailEntity
      const pair = await this.pairRepository
        .createQueryBuilder('pair')
        .leftJoinAndSelect('pair.assortment', 'assortment')
        .leftJoinAndSelect('assortment.invoice', 'invoice')
        .leftJoinAndSelect('invoice.user', 'invoiceUser')
        .leftJoinAndSelect('assortment.item', 'item')
        .leftJoinAndSelect('pair.scannedByUser', 'scannedByUser')
        .where('(pair.pair_uid = :val OR pair.pair_qr = :val)', { val: pairCodeTrimmed })
        .getOne();

      if (!pair) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_FOUND);
      }

      // Verify pair was scanned/redeemed by this retailer
      const isScannedStatus =
        pair.status === InvoicePairScanStatus.SCANNED ||
        pair.status === InvoicePairScanStatus.REDEEMED ||
        pair.status === InvoicePairScanStatus.USED;

      const scannedByRetailer =
        String(pair.scannedByUser?.id ?? '') === String(retailerId) ||
        String(pair.assortment?.invoice?.user?.id ?? '') === String(retailerId);

      if (!isScannedStatus || !scannedByRetailer) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_SCANNED_BY_RETAILER);
      }

      // Verify pair has not been returned in a SUBMITTED return
      const alreadyReturned = await this.repository.findReturnedPairUids([pair.pair_uid]);
      if (alreadyReturned.length > 0) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_ALREADY_RETURNED);
      }

      // Verify pair is not already in current pending return
      const inCurrentReturn = (pendingReturn?.items || []).some(
        (item) => item.pair_uid === pair.pair_uid
      );
      if (inCurrentReturn) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_ALREADY_IN_SESSION);
      }

      const itemCode = pair.assortment?.item?.item_code || pair.assortment?.parent_item_code;
      const subItemCode = pair.sub_item_code || pair.assortment?.packing_item_code;

      await this.transactionService.runInTransaction(async (queryRunner) => {
        await this.repository.addReturnItem(
          {
            customerReturn: pendingReturn!,
            pair: pair ? ({ id: pair.id } as any) : null,
            invoice: pair.assortment?.invoice ? ({ id: pair.assortment.invoice.id } as any) : null,
            pair_uid: pair.pair_uid,
            issue_type: dto.issueType,
            remarks: dto.remarks?.trim() || null,
            item_code: itemCode,
            sub_item_code: subItemCode,
          },
          queryRunner
        );

        const newCount = (pendingReturn?.items?.length || 0) + 1;
        await this.repository.updateTotalPairs(Number(pendingReturn!.id), newCount, queryRunner);
      });

      const updated = await this.repository.findActivePendingByRetailer(retailerId);
      return this.toResponse(updated!);
    });
  }

  /**
   * Updates the issue type/remarks of a pair in the current pending return
   *
   * @param retailerId
   * @param dto
   * @returns
   */
  async updatePairIssue(retailerId: string | number, dto: UpdateCustomerReturnPairIssueDto) {
    const lockKey = `lock:customer-return:retailer:${retailerId}`;

    return this.lock.withLock(lockKey, async () => {
      if (dto.issueType === CustomerReturnIssueType.OTHER && !dto.remarks?.trim()) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.REMARKS_REQUIRED_FOR_OTHER);
      }

      const pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);
      if (!pendingReturn) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.SESSION_NOT_FOUND);
      }

      const item = await this.repository.findItemInReturn(Number(pendingReturn.id), dto.pairCode);
      if (!item) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_IN_SESSION);
      }

      await this.repository.updateReturnItemIssue(
        Number(item.id),
        dto.issueType,
        dto.remarks?.trim() || null
      );

      const updated = await this.repository.findActivePendingByRetailer(retailerId);
      return this.toResponse(updated!);
    });
  }

  /**
   * Removes a pair from the current pending return
   *
   * @param retailerId
   * @param pairCode
   * @returns
   */
  async removePair(retailerId: string | number, pairCode: string) {
    const lockKey = `lock:customer-return:retailer:${retailerId}`;

    return this.lock.withLock(lockKey, async () => {
      const pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);
      if (!pendingReturn) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.SESSION_NOT_FOUND);
      }

      const item = await this.repository.findItemInReturn(Number(pendingReturn.id), pairCode);

      if (!item) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.PAIR_NOT_IN_SESSION);
      }

      await this.transactionService.runInTransaction(async (queryRunner) => {
        await this.repository.removeReturnItem(Number(item.id), queryRunner);

        const newCount = Math.max(0, (pendingReturn.items?.length || 1) - 1);

        await this.repository.updateTotalPairs(Number(pendingReturn.id), newCount, queryRunner);
      });

      const updated = await this.repository.findActivePendingByRetailer(retailerId);
      return this.toResponse(updated!);
    });
  }

  /**
   * Cancels the current pending return
   *
   * @param retailerId
   * @returns
   */
  async cancelActiveReturn(retailerId: string | number) {
    const pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);
    if (!pendingReturn) {
      throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.SESSION_NOT_FOUND);
    }

    await this.repository.updateReturnStatus(
      Number(pendingReturn.id),
      CustomerReturnStatus.CANCELLED
    );

    return { success: true, message: 'Active customer return cancelled successfully' };
  }

  /**
   * Submits the current pending return
   *
   * @param retailerId
   * @param remarks
   * @returns
   */
  async submitActiveReturn(retailerId: string | number, remarks?: string) {
    const lockKey = `lock:customer-return:retailer:${retailerId}`;

    return this.lock.withLock(lockKey, async () => {
      const pendingReturn = await this.repository.findActivePendingByRetailer(retailerId);
      if (!pendingReturn) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.SESSION_NOT_FOUND);
      }

      if (!pendingReturn.items?.length) {
        throw new BusinessException(ERROR_CODES.CUSTOMER_RETURN.SESSION_EMPTY);
      }

      await this.transactionService.runInTransaction(async (queryRunner) => {
        await this.repository.updateTotalPairs(
          Number(pendingReturn.id),
          pendingReturn.items.length,
          queryRunner
        );
        await this.repository.updateReturnStatus(
          Number(pendingReturn.id),
          CustomerReturnStatus.SUBMITTED,
          remarks?.trim() || null,
          queryRunner
        );
      });

      const submitted = await this.repository.findDetailOwnedByRetailer(
        pendingReturn.id,
        retailerId
      );

      ConsoleLogger.log('CUSTOMER_RETURN_SUBMITTED', {
        tag: 'CustomerReturnService',
        data: { id: pendingReturn.id, returnNumber: pendingReturn.return_number },
      });

      return this.toResponse(submitted!);
    });
  }

  /**
   * Gets history of returns made by a retailer
   *
   * @param retailerId
   * @param query
   * @returns
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
   * Gets history of a specific return
   *
   * @param retailerId
   * @param id
   * @returns
   */
  async getHistoryDetail(retailerId: string | number, id: string) {
    const returnRecord = await this.repository.findDetailOwnedByRetailer(id, retailerId);

    if (!returnRecord) {
      throw new BusinessException(ERROR_CODES.COMMON.NOT_FOUND);
    }

    return this.toResponse(returnRecord);
  }
}
