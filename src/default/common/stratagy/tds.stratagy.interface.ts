import moment from 'moment';
import { PointHistory } from 'src/modules/auth/entities';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { DataSource } from 'typeorm';

export class PointHistoryCalculationStrategy {
  private taxLimit = 59400;

  constructor(
    private userId: number,
    private points: bigint,
    private panKyc: number,
    private dataSource: DataSource
  ) {}

  async calculatePoints() {
    const { first, last } = this.getFinancialYearDates();

    const startDateTime = `${first}-03-31 18:30:00`;
    const endDateTime = `${last}-03-31 18:29:59`;

    const redeemedPoints = await this.getRedeemedPoints(startDateTime, endDateTime);

    const hasTdsEntry = await this.hasTdsEntry(startDateTime, endDateTime);

    let totalDeduction = Number(this.points);
    let taxablePoints = 0;
    let taxAmount = 0;
    let panTax = 0;

    const reqPoints = Number(this.points);

    if (redeemedPoints + reqPoints > this.taxLimit) {
      const isPanVerified = !!this.panKyc;

      const multiplier = isPanVerified ? 1.1 : 1.2;
      const multiplierTax = isPanVerified ? 0.1 : 0.2;
      panTax = isPanVerified ? 10 : 20;

      const previousPoints = hasTdsEntry ? 0 : redeemedPoints;

      totalDeduction = Math.round(reqPoints * multiplier);

      taxablePoints = previousPoints + reqPoints;

      taxAmount = Math.round(totalDeduction - reqPoints + previousPoints * multiplierTax);

      totalDeduction = Math.round(reqPoints + taxAmount);
    }

    return {
      totalDeduction,
      taxablePoints,
      taxAmount,
      panTax,
      totalRedemption: redeemedPoints,
    };
  }

  private getFinancialYearDates() {
    const currentYear = moment().utc().year();
    const currentMonth = moment().utc().month() + 1;

    let first = currentYear;
    let last = currentYear + 1;

    if (currentMonth >= 1 && currentMonth <= 3) {
      last = currentYear;
      first = currentYear - 1;
    }

    return { first, last };
  }

  /**
   * Sum of redeemed points after deducting TDS
   * (points - tds_points)
   */
  private async getRedeemedPoints(startDateTime: string, endDateTime: string): Promise<number> {
    const result = await this.dataSource
      .getRepository(PointHistory)
      .createQueryBuilder('uph')
      .select('COALESCE(SUM(uph.points - COALESCE(uph.tds_points, 0)),0)', 'total')
      .where('uph.user_id = :userId', {
        userId: this.userId,
      })
      .andWhere('uph.status = :status', {
        status: PointStatusEnum.redeem,
      })
      .andWhere('uph.created_at BETWEEN :startDateTime AND :endDateTime', {
        startDateTime,
        endDateTime,
      })
      .getRawOne<{ total: string }>();

    return Number(result?.total ?? 0);
  }

  /**
   * Check whether TDS has already been deducted
   * in the current financial year.
   */
  private async hasTdsEntry(startDateTime: string, endDateTime: string): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(PointHistory)
      .createQueryBuilder('uph')
      .where('uph.user_id = :userId', {
        userId: this.userId,
      })
      .andWhere('uph.status = :status', {
        status: PointStatusEnum.redeem,
      })
      .andWhere('uph.tds_points > 0')
      .andWhere('uph.created_at BETWEEN :startDateTime AND :endDateTime', {
        startDateTime,
        endDateTime,
      })
      .getCount();

    return count > 0;
  }
}
