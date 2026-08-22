import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { InvoicePairReturnEntity } from 'src/modules/distributor-return/entities/invoice-pair-return.entity';
import { SuperAdminDistributorReturnRepository } from './repository/super-admin-distributor-return.repository';
import { ListDistributorReturnsQueryDto } from './dto';

@Injectable()
export class SuperAdminDistributorReturnService {
  constructor(private readonly repository: SuperAdminDistributorReturnRepository) {}

  async list(query: ListDistributorReturnsQueryDto) {
    const { items, total } = await this.repository.list({
      distributorId: query.distributorId,
      retailerId: query.retailerId,
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

  async detail(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new BusinessException(ERROR_CODES.DISTRIBUTOR_RETURN.INVOICE_NOT_FOUND);
    }
    return this.toResponse(item);
  }

  private toResponse(item: InvoicePairReturnEntity) {
    return {
      id: item.id,
      pairUid: item.pair_uid,
      pointsRefunded: item.points_refunded,
      remarks: item.remarks,
      createdAt: item.created_at,
      invoice: {
        id: item.invoice?.id,
        invoiceNumber: item.invoice?.invoice_no,
        partyName: item.invoice?.party_name,
      },
      pair: {
        id: item.pair?.id,
        pairUid: item.pair?.pair_uid,
        pairQr: item.pair?.pair_qr,
        status: item.pair?.status,
      },
      retailer: {
        id: item.retailer?.id,
        name: item.retailer?.firmName || item.retailer?.username,
        mobile: item.retailer?.mobile,
      },
      distributor: {
        id: item.distributor?.id,
        name: item.distributor?.firmName || item.distributor?.username,
        mobile: item.distributor?.mobile,
      },
    };
  }
}
