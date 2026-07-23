import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { OrderPlacementItem } from '../entities/order-placement-item.entity';

@Injectable()
export class OrderPlacementItemRepository extends BaseRepository<OrderPlacementItem> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(OrderPlacementItem));
  }

  async saveManyWithTransaction(
    data: Partial<OrderPlacementItem>[],
    queryRunner: QueryRunner
  ): Promise<OrderPlacementItem[]> {
    const repo = queryRunner.manager.getRepository(OrderPlacementItem);
    return repo.save(repo.create(data));
  }
}
