import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { StoreInformation } from '../entities';

@Injectable()
export class StoreInformationRepository extends BaseRepository<StoreInformation> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(StoreInformation));
  }

  async findBySellerId(sellerId: number): Promise<StoreInformation | null> {
    return await this.repository.findOne({ where: { sellerId } as any });
  }
}
