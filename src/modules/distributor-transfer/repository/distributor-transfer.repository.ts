import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { User } from 'src/modules/auth/entities/users.entity';
import { InvoiceEntity } from 'src/modules/invoices/entities/invoice.entity';
import { InvoiceTransferRequestEntity } from '../entities/invoice-transfer-request.entity';
import { TransferRequestStatus } from '../enum/transfer-request-status.enum';

@Injectable()
export class DistributorTransferRepository extends BaseRepository<InvoiceTransferRequestEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource.getRepository(InvoiceTransferRequestEntity));
  }

  findDistributor(distributorId: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({
      select: { id: true, code: true, firmName: true, username: true, mobile: true },
      where: { id: Number(distributorId) },
      relations: ['role'],
    });
  }

  /**
   * invoice_no is only unique per distributor (master_id) — see the distributor-return
   * repository's identical lock-key comment. `invoice.items` is joined so the caller can
   * derive sku_count from the loaded array without a second query.
   */
  findInvoiceForDistributor(
    invoiceNumber: string,
    distributorCode: string,
    manager?: EntityManager,
    forUpdate = false
  ) {
    const query = (manager?.getRepository(InvoiceEntity) ?? this.dataSource.getRepository(InvoiceEntity))
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.invoice_no = :invoiceNumber', { invoiceNumber })
      .andWhere('invoice.master_id = :distributorCode', { distributorCode });

    if (forUpdate) {
      query.setLock('pessimistic_write');
    }

    return query.getOne();
  }

  findExistingPendingTransfer(invoiceId: string, manager?: EntityManager) {
    return (manager?.getRepository(InvoiceTransferRequestEntity) ?? this.repository).findOne({
      where: { invoice_id: invoiceId, status: TransferRequestStatus.PENDING_APPROVAL },
    });
  }

  saveTransferRequest(
    data: Partial<InvoiceTransferRequestEntity>,
    manager: EntityManager
  ): Promise<InvoiceTransferRequestEntity> {
    const repository = manager.getRepository(InvoiceTransferRequestEntity);
    return repository.save(repository.create(data));
  }

  findExistingByRequestNo(requestNo: string, manager: EntityManager) {
    return manager.getRepository(InvoiceTransferRequestEntity).findOne({ where: { request_no: requestNo } });
  }

  findByRequestNoForDistributor(requestNo: string, distributorId: string) {
    return this.repository
      .createQueryBuilder('transfer')
      .innerJoin('transfer.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      .innerJoin('transfer.fromDistributor', 'fromDistributor')
      .addSelect(['fromDistributor.id', 'fromDistributor.firmName', 'fromDistributor.username'])
      // left, not inner — to_distributor_id is null until a distributor allocates themselves,
      // and the sender still needs to see their own unallocated request.
      .leftJoin('transfer.toDistributor', 'toDistributor')
      .addSelect(['toDistributor.id', 'toDistributor.firmName', 'toDistributor.username'])
      .where('transfer.request_no = :requestNo', { requestNo })
      .andWhere(
        '(transfer.from_distributor_id = :distributorId OR transfer.to_distributor_id = :distributorId)',
        { distributorId }
      )
      .getOne();
  }

  async findHistoryForDistributor(
    distributorId: string,
    page: number,
    limit: number
  ): Promise<{ items: InvoiceTransferRequestEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('transfer')
      .innerJoin('transfer.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      // left — an unallocated request (to_distributor_id null) must still show up in the
      // sender's own history.
      .leftJoin('transfer.toDistributor', 'toDistributor')
      .addSelect(['toDistributor.id', 'toDistributor.firmName', 'toDistributor.username'])
      .where('transfer.from_distributor_id = :distributorId', { distributorId })
      .orderBy('transfer.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  /**
   * Unclaimed requests any other distributor can allocate themselves to — pending, no
   * receiving distributor yet, and not this caller's own outgoing request.
   */
  async findOpenRequests(
    excludeDistributorId: string,
    page: number,
    limit: number
  ): Promise<{ items: InvoiceTransferRequestEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('transfer')
      .innerJoin('transfer.invoice', 'invoice')
      .addSelect(['invoice.id', 'invoice.invoice_no', 'invoice.party_name'])
      .innerJoin('transfer.fromDistributor', 'fromDistributor')
      .addSelect(['fromDistributor.id', 'fromDistributor.firmName', 'fromDistributor.username'])
      .where('transfer.status = :status', { status: TransferRequestStatus.PENDING_APPROVAL })
      .andWhere('transfer.to_distributor_id IS NULL')
      .andWhere('transfer.from_distributor_id != :excludeDistributorId', { excludeDistributorId })
      .orderBy('transfer.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findRequestForAllocation(requestNo: string, manager: EntityManager) {
    return manager
      .getRepository(InvoiceTransferRequestEntity)
      .createQueryBuilder('transfer')
      .setLock('pessimistic_write')
      .where('transfer.request_no = :requestNo', { requestNo })
      .getOne();
  }

  allocateDistributor(
    transferId: string,
    distributorId: string,
    manager: EntityManager
  ): Promise<InvoiceTransferRequestEntity> {
    const repository = manager.getRepository(InvoiceTransferRequestEntity);
    return repository.save({ id: transferId, to_distributor_id: distributorId });
  }
}
