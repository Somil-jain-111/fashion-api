import { Injectable } from '@nestjs/common';
import { InvoiceItemRepository, InvoicePairRepository } from '../repository';

export type SkuQuantityEvaluation = {
  allowed: string[];
  exceeded: Array<{
    pairUid: string;
    itemCode: string | undefined;
    reason: string;
  }>;
};

@Injectable()
export class SkuQuantityValidationService {
  constructor(
    private readonly pairRepository: InvoicePairRepository,
    private readonly invoiceItemRepository: InvoiceItemRepository,
  ) {}

  async validate(
    invoiceId: string,
    candidatePairUids: string[],
  ): Promise<SkuQuantityEvaluation> {
    if (!candidatePairUids.length) {
      return {
        allowed: [],
        exceeded: [],
      };
    }

    const [
      { itemCodeByPair, alreadyScanned },
      invoiceQuantity,
    ] = await Promise.all([
      this.pairRepository.getPairScanContext(
        invoiceId,
        candidatePairUids,
      ),
      this.invoiceItemRepository.quantityByItemCode(
        invoiceId,
      ),
    ]);

    const candidates =
      candidatePairUids.map(
        (pairUid) => ({
          pairUid,
          itemCode:
            itemCodeByPair.get(pairUid),
        }),
      );

    return SkuQuantityValidationService.evaluate(
      candidates,
      alreadyScanned,
      invoiceQuantity,
    );
  }

  /**
   * Pure aggregation — no DB access — so the core "does this scan exceed the
   * invoiced quantity for this SKU" logic is directly unit-testable.
   * Processes pairs in array order, so within one bulk-scan batch, earlier
   * UIDs win the last available slot for a SKU and later ones are flagged.
   */
  static evaluate(
    candidatePairs: Array<{
      pairUid: string;
      itemCode: string | undefined;
    }>,
    alreadyScannedByItemCode: Map<
      string,
      number
    >,
    invoiceQuantityByItemCode: Map<
      string,
      number
    >,
  ): SkuQuantityEvaluation {
    const runningCounts =
      new Map(
        alreadyScannedByItemCode,
      );

    const allowed: string[] = [];

    const exceeded: SkuQuantityEvaluation['exceeded'] =
      [];

    for (const {
      pairUid,
      itemCode,
    } of candidatePairs) {
      if (!itemCode) {
        exceeded.push({
          pairUid,
          itemCode,
          reason:
            'ITEM_MAPPING_NOT_FOUND',
        });
        continue;
      }

      const limit =
        invoiceQuantityByItemCode.get(
          itemCode,
        );

      if (limit === undefined) {
        exceeded.push({
          pairUid,
          itemCode,
          reason:
            'ITEM_CODE_NOT_ON_INVOICE',
        });
        continue;
      }

      const current =
        runningCounts.get(itemCode) ?? 0;

      if (current + 1 > limit) {
        exceeded.push({
          pairUid,
          itemCode,
          reason:
            'SKU_QUANTITY_EXCEEDED',
        });
        continue;
      }

      runningCounts.set(
        itemCode,
        current + 1,
      );

      allowed.push(pairUid);
    }

    return {
      allowed,
      exceeded,
    };
  }
}