import { Injectable } from '@nestjs/common';
import { Voucher } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from './base.repository';

@Injectable()
export class VoucherRepository extends BaseRepository<Voucher> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Voucher));
  }
}
