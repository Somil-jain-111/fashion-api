import { Injectable } from '@nestjs/common';
import { OrderItem } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(OrderItem));
  }
}
