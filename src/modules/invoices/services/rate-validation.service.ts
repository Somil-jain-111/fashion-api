import { Injectable } from '@nestjs/common';
import { MasterCatalogueRepository } from '../repository/master-catalogue.repository';

export type RateCheckResult = {
  status: 'OK' | 'MISMATCH' | 'NOT_FOUND';
  expectedRate?: number;
  invoiceRate?: number;
};

const RATE_TOLERANCE = 0.01;

@Injectable()
export class RateValidationService {
  constructor(
    private readonly catalogue: MasterCatalogueRepository,
  ) {}

  async checkRates(
    itemCodes: string[],
    invoiceRateByItemCode: Map<
      string,
      number
    >,
  ): Promise<
    Map<string, RateCheckResult>
  > {
    const catalogueRows =
      await this.catalogue.findByItemCodes(
        itemCodes,
      );

    const result =
      new Map<string, RateCheckResult>();

    for (const itemCode of itemCodes) {
      const invoiceRate =
        invoiceRateByItemCode.get(itemCode);

      const catalogueRow =
        catalogueRows.get(itemCode);

      result.set(
        itemCode,
        RateValidationService.evaluate(
          invoiceRate,
          catalogueRow
            ? Number(
                catalogueRow.wholesalerRate,
              )
            : undefined,
        ),
      );
    }

    return result;
  }

  /** Pure comparison — unit-testable without a database. */
  static evaluate(
    invoiceRate: number | undefined,
    expectedRate: number | undefined,
  ): RateCheckResult {
    if (
      expectedRate === undefined ||
      Number.isNaN(expectedRate)
    ) {
      return {
        status: 'NOT_FOUND',
        invoiceRate,
      };
    }

    if (
      invoiceRate === undefined ||
      Number.isNaN(invoiceRate)
    ) {
      return {
        status: 'NOT_FOUND',
        expectedRate,
      };
    }

    const withinTolerance =
      Math.abs(
        expectedRate - invoiceRate,
      ) < RATE_TOLERANCE;

    return {
      status: withinTolerance
        ? 'OK'
        : 'MISMATCH',
      expectedRate,
      invoiceRate,
    };
  }
}