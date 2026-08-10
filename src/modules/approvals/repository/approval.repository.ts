import { DataSource, QueryRunner } from 'typeorm';
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

  /**
   * Fetches an approval row with a pessimistic write lock, for use inside a
   * transaction. Prevents concurrent action requests on the same approvalId
   * from racing past the PENDING status check.
   */
  async findByIdForUpdate(id: number, queryRunner: QueryRunner): Promise<Approval | null> {
    return queryRunner.manager
      .getRepository(Approval)
      .createQueryBuilder('approval')
      .setLock('pessimistic_write')
      .leftJoinAndSelect('approval.user', 'user')
      .where('approval.id = :id', { id })
      .getOne();
  }

}
