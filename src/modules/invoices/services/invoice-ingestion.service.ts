import { Injectable } from '@nestjs/common';
import { TransactionService } from 'src/default/databases/transaction';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRepository } from 'src/modules/user/repository';
import { InvoiceIngestionRepository } from '../repository/invoice-ingestion.repository';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceStatus, InvoiceScanStatus } from '../enum/invoice.enum';
import { InvoiceType } from '../enum/invoice-scan-session.enum';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';
import { InvoiceAssortmentEntity } from '../entities/invoice-assortment.entity';
import { InvoicePairDetailEntity } from '../entities/invoice-pair-detail.entity';

const POINTS_PER_PAIR = 5;

export interface InvoiceIngestResult {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  totalPairs: number;
  allocatedPoints: number;
  itemCount: number;
  assortmentCount: number;
}

@Injectable()
export class InvoiceIngestionService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly ingestion: InvoiceIngestionRepository,
    private readonly userRepository: UserRepository
  ) {}

  async ingest(dto: CreateInvoiceDto): Promise<InvoiceIngestResult> {
    const existing = await this.ingestion.findDuplicate(dto.invoiceno, dto.masterid);
    if (existing) throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVOICE_ALREADY_EXISTS);

    const itemCodes = new Set(dto.itemlist.map((item) => item.itemcode));
    dto.assortmentdetail.forEach((assortment, index) => {
      if (!itemCodes.has(assortment.itemcode)) {
        throw new BusinessException(ERROR_CODES.INVOICE_SCAN.INVALID_ITEM_REFERENCE, {
          index: String(index),
          itemcode: assortment.itemcode,
        });
      }
    });

    const totalPairs = dto.assortmentdetail.reduce(
      (sum, assortment) =>
        sum +
        assortment.packingInfo.reduce((inner, packing) => inner + packing.pairdetail.length, 0),
      0
    );

    const allocatedPoints = totalPairs * POINTS_PER_PAIR;

    const distributorDetails = await this.userRepository.findOne({
      code: dto.partycode,
      active: true,
    });

    if (!distributorDetails) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    return this.transactionService.runInTransaction(async (queryRunner) => {
      const invoice = await this.ingestion.createInvoice(
        {
          distributor: { id: Number(distributorDetails.id) } as any,
          invoice_no: dto.invoiceno,
          invoice_date: new Date(dto.invoicedate),
          party_code: dto.partycode,
          party_name: dto.partyname,
          master_id: dto.masterid,
          gross_amount: String(dto.grossamount),
          allocated_points: allocatedPoints,
          total_pairs: totalPairs,
          invoice_type: dto.invoiceType ?? InvoiceType.MULTIPLE,
          status: InvoiceStatus.APPROVED,
          scan_status: InvoiceScanStatus.NOT_SCANNED,
        },
        queryRunner
      );

      const itemRows: Partial<InvoiceItemEntity>[] = dto.itemlist.map((item) => ({
        invoice,
        item_code: item.itemcode,
        item_name: item.itemname,
        unit: item.unit,
        quantity: String(item.quantity),
        rate: String(item.rate),
        mrp: String(item.mrp),
        amount: String(item.amount),
        cess: item.cess,
        igst: String(item.igst),
        total_amount: String(item.totalamount),
      }));
      const itemIds = await this.ingestion.createItems(itemRows, queryRunner);
      const itemCodeToId = new Map(
        dto.itemlist.map((item, index) => [item.itemcode, itemIds[index]])
      );

      const assortmentRows: Partial<InvoiceAssortmentEntity>[] = [];
      const pairsPerAssortment: (typeof dto.assortmentdetail)[number]['packingInfo'][number]['pairdetail'][] =
        [];
      for (const assortment of dto.assortmentdetail) {
        const itemId = itemCodeToId.get(assortment.itemcode)!;
        for (const packing of assortment.packingInfo) {
          assortmentRows.push({
            invoice,
            item: { id: Number(itemId) } as any,
            parent_item_code: assortment.itemcode,
            uid: assortment.uid,
            packing_item_code: packing.itemcode,
            quantity: String(packing.quantity),
          });
          pairsPerAssortment.push(packing.pairdetail);
        }
      }
      const assortmentIds = await this.ingestion.createAssortments(assortmentRows, queryRunner);

      const pairRows: Partial<InvoicePairDetailEntity>[] = [];
      assortmentIds.forEach((assortmentId, index) => {
        for (const pair of pairsPerAssortment[index]) {
          pairRows.push({
            invoice: invoice,
            assortment: { id: Number(assortmentId) } as any,
            pair_qr: pair.pairqr,
            pair_uid: pair.pairuid,
            status: InvoicePairScanStatus.UNSCANNED,
          });
        }
      });
      await this.ingestion.createPairDetails(pairRows, queryRunner);

      return {
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoice_no,
        invoiceType: invoice.invoice_type,
        totalPairs,
        allocatedPoints,
        itemCount: itemRows.length,
        assortmentCount: assortmentRows.length,
      };
    });
  }
}
