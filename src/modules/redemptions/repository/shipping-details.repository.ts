import { Injectable } from '@nestjs/common';
import { ShippingDetail } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class ShippingDetailRepository extends BaseRepository<ShippingDetail> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(ShippingDetail));
  }
}
