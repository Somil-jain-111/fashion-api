import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TransactionService } from 'src/default/databases/transaction';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { InvoiceEntity } from 'src/modules/invoices/entities/invoice.entity';
import { InvoiceStatus } from 'src/modules/invoices/enum/invoice.enum';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { DistributorTransferRepository } from './repository/distributor-transfer.repository';
import { CreateTransferDto, ValidateTransferDto } from './dto';

@Injectable()
export class DistributorTransferService {
  constructor(
    private readonly repository: DistributorTransferRepository,
    private readonly transactionService: TransactionService
  ) {}

  async validate(distributorId: string, dto: ValidateTransferDto) {
    const invoice = await this.loadInvoiceForTransfer(distributorId, dto.invoiceNumber);
    return {
      invoiceNumber: invoice.invoice_no,
      totalPairs: invoice.total_pairs,
      skuCount: invoice.items?.length ?? 0,
      billingEstimate: invoice.gross_amount,
    };
  }

  // Creates the request against just the invoice — no receiving distributor is chosen here.
  // The request sits open (to_distributor_id null) until another distributor allocates
  // themselves to it via allocate().
  async create(distributorId: string, dto: CreateTransferDto) {
    const tag = 'DistributorTransferService.create';
    ConsoleLogger.log('DISTRIBUTOR_TRANSFER_START', { tag, data: { distributorId, ...dto } });

    try {
      const result = await this.transactionService.execute(async (manager) => {
        const invoice = await this.loadInvoiceForTransfer(
          distributorId,
          dto.invoiceNumber,
          manager,
          true
        );

        const requestNo = await this.generateUniqueRequestNo(manager);
        const skuCount = invoice.items?.length ?? 0;

        const transfer = await this.repository.saveTransferRequest(
          {
            request_no: requestNo,
            invoice: { id: Number(invoice.id) } as any,
            invoice_no: invoice.invoice_no,
            from_distributor_id: distributorId,
            total_pairs: invoice.total_pairs,
            sku_count: skuCount,
            billing_estimate: invoice.gross_amount,
            remarks: dto.remarks,
          },
          manager
        );

        return {
          requestNo: transfer.request_no,
          status: transfer.status,
          invoiceNumber: invoice.invoice_no,
          totalPairs: transfer.total_pairs,
          skuCount: transfer.sku_count,
          billingEstimate: transfer.billing_estimate,
          remarks: transfer.remarks,
          createdAt: transfer.createdAt,
        };
      });

      ConsoleLogger.log('DISTRIBUTOR_TRANSFER_SUCCESS', { tag, data: result });
      return result;
    } catch (error) {
      ConsoleLogger.error('DISTRIBUTOR_TRANSFER_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  // Any other distributor claims an open (unallocated) request as the receiver.
  async allocate(distributorId: string, requestNo: string) {
    const tag = 'DistributorTransferService.allocate';
    ConsoleLogger.log('DISTRIBUTOR_TRANSFER_ALLOCATE_START', {
      tag,
      data: { distributorId, requestNo },
    });

    try {
      const result = await this.transactionService.execute(async (manager) => {
        const transfer = await this.repository.findRequestForAllocation(requestNo, manager);
        if (!transfer) {
          throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.REQUEST_NOT_FOUND);
        }
        if (transfer.from_distributor_id === distributorId) {
          throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.CANNOT_TRANSFER_TO_SELF);
        }
        if (transfer.to_distributor_id) {
          throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.TRANSFER_ALREADY_ALLOCATED);
        }

        // save() on a partial entity only echoes back what was passed in, not the full row —
        // build the response from the already-loaded `transfer` instead of its return value.
        await this.repository.allocateDistributor(String(transfer.id), distributorId, manager);
        return {
          requestNo: transfer.request_no,
          status: transfer.status,
          invoiceNumber: transfer.invoice_no,
          toDistributorId: distributorId,
        };
      });

      ConsoleLogger.log('DISTRIBUTOR_TRANSFER_ALLOCATE_SUCCESS', { tag, data: result });
      return result;
    } catch (error) {
      ConsoleLogger.error('DISTRIBUTOR_TRANSFER_ALLOCATE_FAILED', error?.stack || error, tag);
      throw error;
    }
  }

  async openRequests(distributorId: string, page: number, limit: number) {
    const { items, total } = await this.repository.findOpenRequests(distributorId, page, limit);
    return {
      items,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  async detail(distributorId: string, requestNo: string) {
    const transfer = await this.repository.findByRequestNoForDistributor(requestNo, distributorId);
    if (!transfer) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.REQUEST_NOT_FOUND);
    }
    return transfer;
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

  private async loadInvoiceForTransfer(
    distributorId: string,
    invoiceNumber: string,
    manager?: EntityManager,
    forUpdate = false
  ): Promise<InvoiceEntity> {
    const distributor = await this.repository.findDistributor(distributorId);
    if (!distributor?.code) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.INVOICE_NOT_FOUND);
    }

    const invoice = await this.repository.findInvoiceForDistributor(
      invoiceNumber,
      distributor.code,
      manager,
      forUpdate
    );
    if (!invoice) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.INVOICE_NOT_FOUND);
    }
    // A transfer moves ownership of stock that was only ever confirmed by an APPROVED
    // invoice — same precondition as the distributor-return flow.
    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.INVOICE_NOT_APPROVED);
    }

    const existingPending = await this.repository.findExistingPendingTransfer(
      String(invoice.id),
      manager
    );
    if (existingPending) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.TRANSFER_ALREADY_REQUESTED);
    }

    return invoice;
  }

  private async generateUniqueRequestNo(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `TRF-CAMPUS-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const existing = await this.repository.findExistingByRequestNo(candidate, manager);
      if (!existing) {
        return candidate;
      }
    }
    throw new BusinessException(ERROR_CODES.COMMON.SOMETHING_WENT_WRONG);
  }
}
