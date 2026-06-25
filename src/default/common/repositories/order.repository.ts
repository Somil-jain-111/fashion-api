import { Injectable } from '@nestjs/common';
import { Order } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from './base.repository';

@Injectable()
export class OrderRepository extends BaseRepository<Order> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Order));
  }
}
