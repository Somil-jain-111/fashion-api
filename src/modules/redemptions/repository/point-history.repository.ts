import { DataSource, QueryRunner } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { PointHistory } from 'src/modules/auth/entities';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { PointStatusEnum } from '../enum/point-history-status.enum.';
import { RedemptionType } from '../enum/redemption-type.enum';

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

  async findByIdAndUser(
    id: number,
    userId: string | number,
    queryRunner?: QueryRunner
  ): Promise<PointHistory | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PointHistory) : this.repository;

    return repo.findOne({
      where: {
        id,
        user: { id: userId } as any,
      } as any,
      relations: ['order', 'payout'],
    });
  }

  async findAllByUser(
    userId: string | number,
    options: {
      page: number;
      limit: number;
      type?: RedemptionType;
      status?: PointStatusEnum;
      startDate?: string;
      endDate?: string;
    },
    queryRunner?: QueryRunner
  ): Promise<[PointHistory[], number]> {
    const qb = this.getRepository(queryRunner)
      .createQueryBuilder('point')
      .leftJoinAndSelect('point.order', 'order')
      .leftJoinAndSelect('point.payout', 'payout')
      .where('point.user_id = :userId', { userId: String(userId) })
      .orderBy('point.date', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit);

    if (options.type) {
      qb.andWhere('point.type = :type', { type: options.type });
    }

    if (options.status) {
      qb.andWhere('point.status = :status', { status: options.status });
    }

    if (options.startDate) {
      qb.andWhere('point.date >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      qb.andWhere('point.date <= :endDate', { endDate: `${options.endDate} 23:59:59` });
    }

    return qb.getManyAndCount();
  }

  async getRemainingPointsForUser(
    userId: string | number,
    queryRunner?: QueryRunner
  ): Promise<{
    userRemainingPoints: number;
    expiredPoints: number;
    redeemedPoints: number;
    lifetimeEarnedPoints: number;
  }> {
    const repo = this.getRepository(queryRunner);

    const latest = await repo
      .createQueryBuilder('point')
      .where('point.user_id = :userId', { userId: String(userId) })
      .orderBy('point.date', 'DESC')
      .addOrderBy('point.id', 'DESC')
      .limit(1)
      .getOne();

    const expiredPoints = await repo
      .createQueryBuilder('expiredPoints')
      .select('SUM(expiredPoints.points)', 'expiredPoints')
      .where('expiredPoints.user_id = :userId', { userId: String(userId) })
      .andWhere('expiredPoints.status = :status', { status: PointStatusEnum.expired })
      .getRawOne();

    const redeemedPoints = await repo
      .createQueryBuilder('redeemedPoints')
      .select('SUM(redeemedPoints.points)', 'redeemedPoints')
      .where('redeemedPoints.user_id = :userId', { userId: String(userId) })
      .andWhere('redeemedPoints.status = :status', { status: PointStatusEnum.redeem })
      .getRawOne();

    const earnedPoints = await repo
      .createQueryBuilder('earnedPoints')
      .select('SUM(earnedPoints.points)', 'earnedPoints')
      .where('earnedPoints.user_id = :userId', { userId: String(userId) })
      .andWhere('(earnedPoints.type = :earnType OR earnedPoints.status = :earnStatus)', {
        earnType: RedemptionType.EARN,
        earnStatus: PointStatusEnum.added,
      })
      .getRawOne();

    return {
      userRemainingPoints: latest?.user_remaining_points ?? 0,
      expiredPoints: Number(expiredPoints?.expiredPoints ?? 0),
      redeemedPoints: Number(redeemedPoints?.redeemedPoints ?? 0),
      lifetimeEarnedPoints: Number(earnedPoints?.earnedPoints ?? 0),
    };
  }
}
