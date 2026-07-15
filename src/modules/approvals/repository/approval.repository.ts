import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { Approval } from 'src/modules/approvals/entities/approval.entity';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ApprovalType } from 'src/default/common/enums/approvals.enum';

@Injectable()
export class ApprovalRepository extends BaseRepository<Approval> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Approval));
  }


  async findByUserId(userId: number, approvalType: ApprovalType): Promise<Approval[]> {
    return this.getRepository()
      .createQueryBuilder('approval')
      .where('approval.user_id = :userId', { userId })
      .andWhere('approval.approval_type = :type', { type: approvalType })
      .orderBy('approval.id', 'DESC')
      .getMany();
  }

}
