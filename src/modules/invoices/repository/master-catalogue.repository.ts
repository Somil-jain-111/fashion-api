import { Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { MasterCatalogueEntity } from '../entities/master-catalogue.entity';

@Injectable()
export class MasterCatalogueRepository extends BaseRepository<MasterCatalogueEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(MasterCatalogueEntity));
  }

  async findByItemCodes(
    itemCodes: string[],
    queryRunner?: QueryRunner
  ): Promise<Map<string, MasterCatalogueEntity>> {
    if (!itemCodes.length) {
      return new Map();
    }

    const rows = await this.getRepository(queryRunner).find({
      where: {
        itemCode: In(itemCodes),
        active: true,
      },
    });

    return new Map(rows.map((row) => [row.itemCode, row]));
  }
}
