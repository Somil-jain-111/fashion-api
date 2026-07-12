import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { RedemptionConfig } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';

@Injectable()
export class RedemptionConfigRepository extends BaseRepository<RedemptionConfig> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(RedemptionConfig));
  }
}
