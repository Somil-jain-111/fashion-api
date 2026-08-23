import { Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { CustomerReturnEntity } from '../entities/customer-return.entity';
import { CustomerReturnItemEntity } from '../entities/customer-return-item.entity';
import { CustomerReturnIssueType, CustomerReturnStatus } from '../enum/customer-return.enum';

@Injectable()
export class CustomerReturnRepository extends BaseRepository<CustomerReturnEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(CustomerReturnEntity));
  }

  private getItemRepo(queryRunner?: QueryRunner) {
    return queryRunner
      ? queryRunner.manager.getRepository(CustomerReturnItemEntity)
      : this.repository.manager.getRepository(CustomerReturnItemEntity);
  }

  async findActivePendingByRetailer(
    retailerId: string | number,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnEntity | null> {
    return await this.getRepository(queryRunner)
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.items', 'items')
      .leftJoinAndSelect('items.pair', 'pair')
      .leftJoinAndSelect('items.invoice', 'invoice')
      .where('cr.retailer_id = :retailerId', { retailerId: String(retailerId) })
      .andWhere('cr.status = :status', { status: CustomerReturnStatus.PENDING })
      .orderBy('cr.createdAt', 'DESC')
      .getOne();
  }

  async createPendingReturn(
    retailerId: string | number,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnEntity> {
    const returnNumber = `CR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const entity = this.create({
      return_number: returnNumber,
      retailer: { id: Number(retailerId) } as any,
      total_pairs: 0,
      status: CustomerReturnStatus.PENDING,
    });
    return await this.save(entity, queryRunner);
  }

  async findReturnedPairUids(pairUids: string[], queryRunner?: QueryRunner): Promise<string[]> {
    if (!pairUids.length) return [];
    const items = await this.getItemRepo(queryRunner)
      .createQueryBuilder('item')
      .leftJoin('item.customerReturn', 'cr')
      .select('item.pair_uid', 'pair_uid')
      .where('item.pair_uid IN (:...pairUids)', { pairUids })
      .andWhere('cr.status = :submittedStatus', { submittedStatus: CustomerReturnStatus.SUBMITTED })
      .getRawMany();

    return items.map((i) => i.pair_uid);
  }

  async findItemInReturn(
    returnId: number,
    pairCode: string,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnItemEntity | null> {
    const code = pairCode.trim();
    return await this.getItemRepo(queryRunner)
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.pair', 'pair')
      .leftJoinAndSelect('item.customerReturn', 'cr')
      .where('cr.id = :returnId', { returnId })
      .andWhere('(item.pair_uid = :code OR pair.pair_qr = :code)', { code })
      .getOne();
  }

  async addReturnItem(
    data: Partial<CustomerReturnItemEntity>,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnItemEntity> {
    const repo = this.getItemRepo(queryRunner);
    return await repo.save(repo.create(data));
  }

  async removeReturnItem(itemId: number, queryRunner?: QueryRunner): Promise<void> {
    const repo = this.getItemRepo(queryRunner);
    await repo.delete(itemId);
  }

  async updateReturnItemIssue(
    itemId: number,
    issueType: CustomerReturnIssueType,
    remarks?: string | null,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const repo = this.getItemRepo(queryRunner);
    await repo.update(itemId, {
      issue_type: issueType,
      remarks: remarks ?? null,
    });
  }

  async updateTotalPairs(
    returnId: number,
    totalPairs: number,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const repo = this.getRepository(queryRunner);
    await repo.update(returnId, { total_pairs: totalPairs });
  }

  async updateReturnStatus(
    returnId: number,
    status: CustomerReturnStatus,
    remarks?: string | null,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const repo = this.getRepository(queryRunner);
    await repo.update(returnId, {
      status,
      remarks: remarks ?? null,
    });
  }

  async findHistoryByRetailer(
    retailerId: string | number,
    options: {
      page: number;
      limit: number;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
    queryRunner?: QueryRunner
  ): Promise<[CustomerReturnEntity[], number]> {
    const qb = this.getRepository(queryRunner)
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.items', 'items')
      .leftJoinAndSelect('items.pair', 'pair')
      .leftJoinAndSelect('items.invoice', 'invoice')
      .where('cr.retailer_id = :retailerId', { retailerId: String(retailerId) })
      .orderBy('cr.createdAt', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit);

    if (options.search) {
      qb.andWhere(
        '(cr.return_number LIKE :search OR items.pair_uid LIKE :search OR items.item_code LIKE :search)',
        { search: `%${options.search.trim()}%` }
      );
    }

    if (options.startDate) {
      qb.andWhere('cr.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      qb.andWhere('cr.createdAt <= :endDate', { endDate: `${options.endDate} 23:59:59` });
    }

    return await qb.getManyAndCount();
  }

  async findDetailOwnedByRetailer(
    returnId: string | number,
    retailerId: string | number,
    queryRunner?: QueryRunner
  ): Promise<CustomerReturnEntity | null> {
    return await this.getRepository(queryRunner)
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.items', 'items')
      .leftJoinAndSelect('items.pair', 'pair')
      .leftJoinAndSelect('items.invoice', 'invoice')
      .where('cr.id = :returnId', { returnId: Number(returnId) })
      .andWhere('cr.retailer_id = :retailerId', { retailerId: String(retailerId) })
      .getOne();
  }
}
