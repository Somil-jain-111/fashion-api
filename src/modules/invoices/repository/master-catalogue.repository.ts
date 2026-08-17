import { Injectable } from '@nestjs/common';
import {
  DataSource,
  In,
} from 'typeorm';
import { MasterCatalogueEntity } from '../entities/master-catalogue.entity';

@Injectable()
export class MasterCatalogueRepository {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async findByItemCodes(
    itemCodes: string[],
  ): Promise<
    Map<string, MasterCatalogueEntity>
  > {
    if (!itemCodes.length) {
      return new Map();
    }

    const rows =
      await this.dataSource
        .getRepository(
          MasterCatalogueEntity,
        )
        .find({
          where: {
            itemCode: In(itemCodes),
            active: true,
          },
        });

    return new Map(
      rows.map((row) => [
        row.itemCode,
        row,
      ]),
    );
  }
}