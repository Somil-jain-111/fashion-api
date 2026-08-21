import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { User } from 'src/modules/auth/entities/users.entity';
import { InvoiceEntity } from 'src/modules/invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from 'src/modules/invoices/entities/invoice-pair-detail.entity';
import { InvoiceItemEntity } from 'src/modules/invoices/entities/invoice-item.entity';
import { PointHistory } from 'src/modules/redemptions/entities/point-history.entity';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { InvoicePairReturnEntity } from '../entities/invoice-pair-return.entity';

@Injectable()
export class DistributorReturnRepository extends BaseRepository<InvoicePairReturnEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource.getRepository(InvoicePairReturnEntity));
  }

  findDistributor(distributorId: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({
      select: { id: true, code: true },
      where: { id: Number(distributorId) },
    });
  }

  /**
   * Looks the pair up on its own — the invoice is derived from it (via its assortment)
   * rather than taken as input. A physical QR scan may decode to either pair_uid or the
   * pair_qr payload depending on the scanner/label, so both columns are matched.
   */
  findPairByCode(pairCode: string, manager?: EntityManager) {
    return (
      manager?.getRepository(InvoicePairDetailEntity) ??
      this.dataSource.getRepository(InvoicePairDetailEntity)
    )
      .createQueryBuilder('pair')
      .innerJoin('pair.assortment', 'assortment')
      .addSelect(['assortment.id', 'assortment.invoice_id', 'assortment.parent_item_code'])
      .where('(pair.pair_uid = :pairCode OR pair.pair_qr = :pairCode)', { pairCode })
      .getOne();
  }

  /**
   * invoice_assortments only carries the item code (parent_item_code), not a direct FK to
   * invoice_items — join on (invoice_id, item_code) to resolve the product name for display.
   */
  findProductForPair(
    invoiceId: string,
    itemCode: string,
    manager?: EntityManager
  ): Promise<InvoiceItemEntity | null> {
    return (manager?.getRepository(InvoiceItemEntity) ?? this.dataSource.getRepository(InvoiceItemEntity))
      .createQueryBuilder('item')
      .select(['item.id', 'item.item_code', 'item.item_name'])
      .where('item.invoice_id = :invoiceId', { invoiceId })
      .andWhere('item.item_code = :itemCode', { itemCode })
      .getOne();
  }

  /**
   * `forUpdate` locks both the invoice row and the joined retailer/user row in one query,
   * since a SELECT ... FOR UPDATE with a join locks every table it touches in MySQL.
   */
  findInvoiceById(invoiceId: string, manager?: EntityManager, forUpdate = false) {
    const query = (manager?.getRepository(InvoiceEntity) ?? this.dataSource.getRepository(InvoiceEntity))
      .createQueryBuilder('invoice')
      .innerJoinAndSelect('invoice.user', 'retailer')
      .where('invoice.id = :invoiceId', { invoiceId });

    if (forUpdate) {
      query.setLock('pessimistic_write');
    }

    return query.getOne();
  }

  saveInvoice(invoice: InvoiceEntity, manager: EntityManager): Promise<InvoiceEntity> {
    return manager.getRepository(InvoiceEntity).save(invoice);
  }

  findExistingReturn(pairId: string, manager?: EntityManager) {
    return (manager?.getRepository(InvoicePairReturnEntity) ?? this.repository).findOne({
      where: { pair_id: pairId },
    });
  }

  saveReturn(
    data: Partial<InvoicePairReturnEntity>,
    manager: EntityManager
  ): Promise<InvoicePairReturnEntity> {
    const repository = manager.getRepository(InvoicePairReturnEntity);
    return repository.save(repository.create(data));
  }

  updateRetailerPoints(retailerId: string, points: bigint, manager: EntityManager) {
    return manager.getRepository(User).update({ id: Number(retailerId) }, { points });
  }

  savePointHistory(
    data: {
      retailerId: string;
      points: number;
      balance: number;
      transactionId: string;
      description: string;
    },
    manager: EntityManager
  ): Promise<PointHistory> {
    const repository = manager.getRepository(PointHistory);
    return repository.save(
      repository.create({
        user: { id: Number(data.retailerId) } as User,
        points: data.points,
        description: data.description,
        type: RedemptionType.REDEMPTION,
        status: PointStatusEnum.refund,
        date: new Date(),
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        user_remaining_points: data.balance,
        transaction_id: data.transactionId,
      })
    );
  }

  async findHistoryForDistributor(
    distributorId: string,
    page: number,
    limit: number
  ): Promise<{ items: InvoicePairReturnEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('return')
      .innerJoin('return.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      .innerJoin('return.pair', 'pair')
      .addSelect(['pair.id', 'pair.pair_uid', 'pair.pair_qr', 'pair.status'])
      .innerJoin('return.retailer', 'retailer')
      .addSelect(['retailer.id', 'retailer.firmName', 'retailer.username', 'retailer.mobile'])
      .where('return.distributor_id = :distributorId', { distributorId })
      .orderBy('return.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }
}
