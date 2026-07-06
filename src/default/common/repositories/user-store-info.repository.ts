import { DataSource } from 'typeorm';
import { BaseRepository } from './base.repository';
import { UserStoreInfo } from 'src/modules/auth/entities/user-store-info.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserStoreInfoRepository extends BaseRepository<UserStoreInfo> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(UserStoreInfo));
  }
}
