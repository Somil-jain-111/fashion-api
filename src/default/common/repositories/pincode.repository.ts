import { Injectable } from '@nestjs/common';
import { Pincode } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from './base.repository';

@Injectable()
export class PincodeRepository extends BaseRepository<Pincode> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Pincode));
  }
}
