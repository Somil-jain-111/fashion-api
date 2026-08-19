import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserMappingRepository } from 'src/modules/auth/repository';
import { RetailerInvoiceRepository } from '../repository/retailer-invoice.repository';

export interface RetailerInvoiceValidationResult {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: string;
  distributorId: string;
}

@Injectable()
export class RetailerInvoiceService {
  constructor(
    private readonly invoices: RetailerInvoiceRepository,
    private readonly userMappings: UserMappingRepository
  ) {}

  async validate(invoiceNumber: string, retailerId: string): Promise<RetailerInvoiceValidationResult> {
    const invoice = await this.invoices.findByInvoiceNumber(invoiceNumber);
    if (!invoice) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);

    const mappings = await this.userMappings.findMappedDistributors(Number(retailerId));
    const mappedDistributorIds = new Set(mappings.map((mapping) => String(mapping.parent.id)));

    if (!invoice.distributor || !mappedDistributorIds.has(String(invoice.distributor.id))) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_DISTRIBUTOR_MISMATCH);
    }

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_no,
      invoiceType: invoice.invoice_type,
      distributorId: String(invoice.distributor.id),
    };
  }
}
