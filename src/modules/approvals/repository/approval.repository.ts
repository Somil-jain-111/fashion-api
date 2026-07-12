import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { Approval } from 'src/modules/approvals/entities/approval.entity';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class ApprovalRepository extends BaseRepository<Approval> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Approval));
  }
}
