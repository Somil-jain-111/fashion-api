import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';

import { BaseRepository } from './base.repository';
import { Address } from 'src/modules/addresses/entities/address.entity';

@Injectable()
export class AddressRepository extends BaseRepository<Address> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Address));
  }

  async findByUserId(userId: bigint): Promise<Address[]> {
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

  async findDefaultAddress(userId: bigint): Promise<Address | null> {
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

  async findActiveAddressById(addressId: bigint, userId: bigint): Promise<Address | null> {
    return await this.repository.findOne({
      where: {
        id: addressId,
        user: {
          id: userId,
        },
        status: 1,
      } as FindOptionsWhere<Address>,
    });
  }

  async softDeleteAddress(addressId: bigint, userId: bigint): Promise<void> {
    await await this.repository.update(
      {
        id: addressId,
        user: {
          id: userId,
        },
      } as FindOptionsWhere<Address>,
      {
        status: 2,
        isDefault: false,
      }
    );
  }

  async removeDefaultAddress(userId: bigint): Promise<void> {
    await this.repository.update(
      {
        user: {
          id: userId,
        },
        isDefault: true,
        status: 1,
      } as FindOptionsWhere<Address>,
      {
        isDefault: false,
      }
    );
  }

  async setDefaultAddress(addressId: bigint, userId: bigint): Promise<void> {
    await this.removeDefaultAddress(userId);

    await this.repository.update(
      {
        id: addressId,
        user: {
          id: userId,
        },
        status: 1,
      } as FindOptionsWhere<Address>,
      {
        isDefault: true,
      }
    );
  }

  async findByUserIdPaginated(userId: bigint, page = 1, limit = 10): Promise<[Address[], number]> {
    return await this.repository.findAndCount({
      where: {
        user: {
          id: userId,
        },
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
