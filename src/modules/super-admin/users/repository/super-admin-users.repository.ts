import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from 'src/modules/auth/entities';
import { Address } from 'src/modules/addresses/entities/address.entity';
import { KycVerificationEntity } from 'src/modules/kyc/entities/kyc-verification.entity';
import { UserMapping } from 'src/modules/auth/entities/user-mapping.entity';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';

export interface ListUsersFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class SuperAdminUsersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(filters: ListUsersFilters): Promise<{ items: User[]; total: number }> {
    const qb = this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.role) {
      qb.andWhere('role.name = :role', { role: filters.role });
    }
    if (filters.status) {
      qb.andWhere('user.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(user.mobile LIKE :search OR user.email LIKE :search OR user.firmName LIKE :search OR user.username LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findById(id: number): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id }, relations: { role: true } });
  }

  findAddressesByUserId(userId: number): Promise<Address[]> {
    return this.dataSource.getRepository(Address).find({ where: { user: { id: userId } } });
  }

  findKycByUserId(userId: number): Promise<KycVerificationEntity[]> {
    return this.dataSource
      .getRepository(KycVerificationEntity)
      .createQueryBuilder('kyc')
      .where('kyc.user_id = :userId', { userId })
      .orderBy('kyc.created_at', 'DESC')
      .getMany();
  }

  /**
   * Distributors/sub-distributors this user (as a retailer) is mapped to.
   */
  findMappingsAsChild(userId: number): Promise<UserMapping[]> {
    return this.dataSource.getRepository(UserMapping).find({
      where: { child: { id: userId } },
      relations: { parent: { role: true } },
    });
  }

  /**
   * Retailers mapped to this user (when this user is a distributor/sub-distributor).
   */
  findMappingsAsParent(userId: number): Promise<UserMapping[]> {
    return this.dataSource.getRepository(UserMapping).find({
      where: { parent: { id: userId } },
      relations: { child: { role: true } },
    });
  }
}
