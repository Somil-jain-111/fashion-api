import { Injectable } from '@nestjs/common';
import { InvoiceRepository, InvoiceSessionRepository } from '../repository';
import { UserMappingRepository } from 'src/modules/auth/repository/user-mapping.repository';
import { MappingStatus } from 'src/default/common/enums/user-mapping.enum';
import { InvoiceOwnerType, InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { InvoiceSummaryResponseDto } from '../dto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class InvoiceValidationService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly sessionRepository: InvoiceSessionRepository,
    private readonly userMappingRepository: UserMappingRepository
  ) {}

  async findInvoice(invoiceIdOrNumber: string) {
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('invoice.distributor', 'distributor')
      .where('invoice.id = :val OR invoice.invoice_no = :val', { val: invoiceIdOrNumber })
      .getOne();
  }

  async validateInvoice(
    invoiceIdOrNumber: string,
    userId: string,
    ownerType: InvoiceOwnerType = InvoiceOwnerType.RETAILER
  ): Promise<InvoiceSummaryResponseDto> {
    if (!invoiceIdOrNumber) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    }

    // 1. Fetch Invoice by invoiceId / invoiceNumber
    const invoice = await this.findInvoice(invoiceIdOrNumber);

    if (!invoice) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_NOT_FOUND);
    }

    // Verify it exists and is in ACTIVE / APPROVED state
    if (invoice.status !== InvoiceStatus.APPROVED && invoice.status !== InvoiceStatus.ACTIVE) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_INACTIVE);
    }

    // 2. Verify invoice is not currently being scanned (scan_status != IN_PROGRESS and no active session lock)
    if (invoice.scan_status === InvoiceScanStatus.IN_PROGRESS) {
      const activeSession = await this.sessionRepository.findActive(String(invoice.id), userId);

      if (!activeSession) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_IN_PROGRESS_OTHER_USER);
      }
    }

    // 3. Validate Distributor Mapping: Query UserMapping where parent_user_id = distributor_id, child_user_id = req.user.id, status = ACTIVE
    if (invoice.distributor?.id) {
      const mapping = await this.userMappingRepository.findOne({
        parent: { id: Number(invoice.distributor.id) },
        child: { id: Number(userId) },
        status: MappingStatus.ACTIVE,
      });

      if (!mapping) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_DISTRIBUTOR_MISMATCH);
      }
    }

    // Claim invoice by the user IF it is not scanned
    if (!invoice.user) {
      invoice.user = { id: Number(userId) } as any;
      invoice.user_type = ownerType;
      await this.invoiceRepository.saveInvoice(invoice);
    }

    // 4. Claim Invoice: Update invoice.user_id = req.user.id (marking invoice to retailer)
    if (String(invoice.user.id) !== String(userId)) {
      throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_ALREADY_CLAIMED);
    }

    const session = await this.sessionRepository.findActive(String(invoice.id), userId);
    const scanned = invoice.scanned_pairs ?? 0;

    return {
      invoiceId: String(invoice.id),
      invoiceNumber: invoice.invoice_no,
      invoiceType: invoice.invoice_type,
      totalPairs: invoice.total_pairs,
      invoiceValue: String(Math.ceil(Number(invoice.gross_amount))),
      distributorName:
        invoice.distributor?.firmName || invoice.distributor?.username || invoice.party_name || '',
      alreadyScanned: scanned,
      remainingPairs: Math.max(0, invoice.total_pairs - scanned),
      resume: Boolean(session),
      status: invoice.status,
      scanStatus: invoice.scan_status,
    };
  }
}
