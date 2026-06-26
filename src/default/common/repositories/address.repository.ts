import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';

import { BaseRepository } from './base.repository';
import { Address } from 'src/modules/addresses/entities/address.entity';

@Injectable()
export class AddressRepository extends BaseRepository<Address> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Address));
  }

  async findByUserId(userId: string): Promise<Address[]> {
    return await this.repository.find({
      where: {
        user: {
          id: userId,
        },
        status: 1,
      } as FindOptionsWhere<Address>,
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findDefaultAddress(userId: string): Promise<Address | null> {
    return await this.repository.findOne({
      where: {
        user: {
          id: userId,
        },
        isDefault: true,
        status: 1,
      } as FindOptionsWhere<Address>,
    });
  }

  async findActiveAddressById(addressId: string, userId: string): Promise<Address | null> {
    return await this.repository.findOne({
      where: {
        id: addressId,
        user_id: userId,
        status: 1,
      } as FindOptionsWhere<Address>,
    });
  }

  async softDeleteAddress(addressId: string, userId: string): Promise<void> {
    await await this.repository.update(
      {
        id: addressId,
        user_id: userId,
      } as FindOptionsWhere<Address>,
      {
        status: 2,
        isDefault: false,
      }
    );
  }

  async removeDefaultAddress(userId: string): Promise<void> {
    await this.repository.update(
      {
        user_id: userId,
        isDefault: true,
        status: 1,
      } as FindOptionsWhere<Address>,
      {
        isDefault: false,
      }
    );
  }

  async setDefaultAddress(addressId: string, userId: string): Promise<void> {
    await this.removeDefaultAddress(userId);

    await this.repository.update(
      {
        id: addressId,
        user_id: userId,
        status: 1,
      } as FindOptionsWhere<Address>,
      {
        isDefault: true,
      }
    );
  }

  async findByUserIdPaginated(userId: string, page = 1, limit = 10): Promise<[Address[], number]> {
    return await this.repository.findAndCount({
      where: {
        user_id: userId,
        status: 1,
      } as FindOptionsWhere<Address>,
      order: {
        created_at: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
