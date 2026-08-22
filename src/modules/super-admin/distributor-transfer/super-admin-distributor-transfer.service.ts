import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { InvoiceTransferRequestEntity } from 'src/modules/distributor-transfer/entities/invoice-transfer-request.entity';
import { SuperAdminDistributorTransferRepository } from './repository/super-admin-distributor-transfer.repository';
import { ListDistributorTransfersQueryDto } from './dto';

@Injectable()
export class SuperAdminDistributorTransferService {
  constructor(private readonly repository: SuperAdminDistributorTransferRepository) {}

  async list(query: ListDistributorTransfersQueryDto) {
    const { items, total } = await this.repository.list({
      fromDistributorId: query.fromDistributorId,
      toDistributorId: query.toDistributorId,
      status: query.status,
      invoiceNumber: query.invoiceNumber,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: new AddressPaginationDTO(total, Math.ceil(total / query.limit), query.page, query.limit),
    };
  }

  async detail(requestNo: string) {
    const item = await this.repository.findByRequestNo(requestNo);
    if (!item) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_TRANSFER.REQUEST_NOT_FOUND);
    }
    return this.toResponse(item);
  }

  private toResponse(item: InvoiceTransferRequestEntity) {
    return {
      requestNo: item.request_no,
      status: item.status,
      invoiceNumber: item.invoice_no,
      totalPairs: item.total_pairs,
      skuCount: item.sku_count,
      billingEstimate: item.billing_estimate,
      remarks: item.remarks,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      invoice: {
        id: item.invoice?.id,
        invoiceNumber: item.invoice?.invoice_no,
        partyName: item.invoice?.party_name,
      },
      fromDistributor: {
        id: item.fromDistributor?.id,
        name: item.fromDistributor?.firmName || item.fromDistributor?.username,
        mobile: item.fromDistributor?.mobile,
      },
      toDistributor: item.toDistributor
        ? {
            id: item.toDistributor.id,
            name: item.toDistributor.firmName || item.toDistributor.username,
            mobile: item.toDistributor.mobile,
          }
        : null,
    };
  }
}
