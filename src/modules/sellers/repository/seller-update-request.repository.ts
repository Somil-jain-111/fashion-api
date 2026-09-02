import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  SellerUpdateRequest,
  SellerUpdateRequestStatus,
} from '../entities/seller-update-request.entity';
import { SellerReviewSection } from '../entities';

@Injectable()
export class SellerUpdateRequestRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findPending(sellerId: number, section?: SellerReviewSection) {
    return this.dataSource.getRepository(SellerUpdateRequest).findOne({
      where: {
        sellerId,
        status: SellerUpdateRequestStatus.PENDING,
        ...(section && { section }),
      },
      order: { id: 'DESC' },
    });
  }

  async create(sellerId: number, section: SellerReviewSection, reason: string) {
    const repository = this.dataSource.getRepository(SellerUpdateRequest);
    return repository.save(repository.create({ sellerId, section, reason }));
  }
}
