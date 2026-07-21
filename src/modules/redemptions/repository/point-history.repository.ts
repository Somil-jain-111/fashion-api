import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { PointHistory } from 'src/modules/auth/entities';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { PointStatusEnum } from '../enum/point-history-status.enum.';

@Injectable()
export class PointHistoryRepository extends BaseRepository<PointHistory> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(PointHistory));
  }

  async transactionPerDay(userId: number | bigint) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.repository
      .createQueryBuilder('ph')
      .select('COUNT(ph.id)', 'count')
      .addSelect('SUM(ph.points)', 'totalPoints')
      .where('ph.user_id = :userId', { userId })
      .andWhere('ph.date >= :today', { today })
      .andWhere('ph.status = :status', { status: PointStatusEnum.redeem })
      .getRawOne();

    return {
      transactionCount: Number(result?.count || 0),
      totalPoints: Number(result?.totalPoints || 0),
    };
  }

  async transactionMonthlyPoints(userId: number | bigint): Promise<number> {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const result = await this.repository
      .createQueryBuilder('ph')
      .select('SUM(ph.points)', 'totalPoints')
      .where('ph.user_id = :userId', { userId })
      .andWhere('ph.date >= :firstDayOfMonth', { firstDayOfMonth })
      .andWhere('ph.status = :status', { status: PointStatusEnum.redeem })
      .getRawOne();

    return Number(result?.totalPoints || 0);
  }

  async getTotalPointsForPanCheck(userId: number | bigint): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('ph')
      .select('SUM(ph.points)', 'totalPoints')
      .where('ph.user_id = :userId', { userId })
      .andWhere('ph.status = :status', { status: PointStatusEnum.redeem })
      .getRawOne();

    return Number(result?.totalPoints || 0);
  }
}
