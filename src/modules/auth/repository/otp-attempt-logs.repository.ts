import { DataSource, QueryRunner } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { OTPAttemptLogs } from '../entities';
import { BaseRepository } from 'src/default/common/repositories';
import { OtpAttemptType } from 'src/default/common/enums/common.enum';

@Injectable()
export class OTPAttemptLogsRepository extends BaseRepository<OTPAttemptLogs> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(OTPAttemptLogs));
  }

  async saveLog(data: Partial<OTPAttemptLogs>, queryRunner?: QueryRunner) {
    return await this.getRepository(queryRunner).save(data);
  }
}
