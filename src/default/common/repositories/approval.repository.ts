import { DataSource } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Approval } from 'src/modules/approvals/entities/approval.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApprovalRepository extends BaseRepository<Approval> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Approval));
  }
}
