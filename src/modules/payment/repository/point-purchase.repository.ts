import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { PointPurchase, PointPurchaseStatus } from '../entities';

@Injectable()
export class PointPurchaseRepository extends BaseRepository<PointPurchase> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(PointPurchase));
  }

  findByReference(referenceId: string, queryRunner?: QueryRunner): Promise<PointPurchase | null> {
    return this.getRepository(queryRunner).findOne({ where: { referenceId } });
  }

  findByPaymentLinkId(
    paymentLinkId: string,
    queryRunner?: QueryRunner,
    lock = false
  ): Promise<PointPurchase | null> {
    const query = this.getRepository(queryRunner)
      .createQueryBuilder('purchase')
      .where('purchase.payment_link_id = :paymentLinkId', { paymentLinkId });
    if (lock && queryRunner) query.setLock('pessimistic_write');
    return query.getOne();
  }

  createPending(
    data: {
      referenceId: string;
      userId: string;
      points: number;
      baseAmountPaise: number;
      platformFeePaise: number;
      gstAmountPaise: number;
      payableAmountPaise: number;
    },
    queryRunner?: QueryRunner
  ): Promise<PointPurchase> {
    return this.save(
      {
        ...data,
        status: PointPurchaseStatus.CREATING,
      },
      queryRunner
    );
  }

  async markLinkCreated(
    id: number,
    paymentLinkId: string,
    paymentUrl: string,
    providerPayload: Record<string, unknown>,
    queryRunner?: QueryRunner
  ): Promise<void> {
    await this.getRepository(queryRunner).update(
      { id },
      {
        paymentLinkId,
        paymentUrl,
        providerPayload,
        status: PointPurchaseStatus.PENDING,
      }
    );
  }

  async markFailed(id: number, failureReason: string, queryRunner?: QueryRunner): Promise<void> {
    await this.getRepository(queryRunner).update(
      { id },
      { status: PointPurchaseStatus.FAILED, failureReason: failureReason.slice(0, 500) }
    );
  }

  async markPaid(
    id: number,
    razorpayPaymentId: string,
    providerPayload: Record<string, unknown>,
    queryRunner: QueryRunner
  ): Promise<void> {
    await this.getRepository(queryRunner).update(
      { id },
      {
        status: PointPurchaseStatus.PAID,
        razorpayPaymentId,
        paidAt: new Date(),
        providerPayload,
        failureReason: null,
      }
    );
  }
}
