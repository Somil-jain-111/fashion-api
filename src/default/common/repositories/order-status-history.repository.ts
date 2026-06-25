import { Injectable } from '@nestjs/common';
import { OrderStatusHistory } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from './base.repository';

@Injectable()
export class OrderStatusHistoryRepository extends BaseRepository<OrderStatusHistory> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(OrderStatusHistory));
  }
}
