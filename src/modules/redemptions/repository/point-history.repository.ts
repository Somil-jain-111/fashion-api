import { Injectable } from '@nestjs/common';
import { PointHistory } from 'src/modules/auth/entities';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class PointHistoryRepository extends BaseRepository<PointHistory> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(PointHistory));
  }
}
