import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
//
import { Address } from 'src/modules/addresses/entities/address.entity';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class AddressRepository extends BaseRepository<Address> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Address));
  }

  async findByUserId(userId: number): Promise<Address[]> {
    return await this.repository.find({
      where: {
        user: {
          id: userId,
        },
      } as FindOptionsWhere<Address>,
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findDefaultAddress(userId: number): Promise<Address | null> {
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

  async findActiveAddressById(addressId: string, userId: number): Promise<Address | null> {
    return await this.repository.findOne({
      where: {
        id: Number(addressId),
        user: { id: userId },
        active: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async softDeleteAddress(addressId: string, userId: number): Promise<void> {
    await await this.repository.update(
      {
        id: Number(addressId),
        user: { id: userId },
      },
      {
        active: false,
      }
    );
  }

  async findByUserIdPaginated(userId: number, page = 1, limit = 10): Promise<[Address[], number]> {
    return await this.repository.findAndCount({
      where: {
        user: { id: userId },
        active: true,
      },
      order: {
        createdAt: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * OBSOLETE
   */

  // async removeDefaultAddress(userId: string): Promise<void> {
  //   await this.repository.update(
  //     {
  //       user: { id: Number(userId) },
  //       isDefault: true,
  //       active: true,
  //     } as FindOptionsWhere<Address>,
  //     {
  //       // isDefault: false,
  //     }
  //   );
  // }

  // async setDefaultAddress(addressId: string, userId: string): Promise<void> {
  //   await this.removeDefaultAddress(userId);

  //   await this.repository.update(
  //     {
  //       id: Number(addressId),
  //       user: { id: Number(userId) },
  //       active: true,
  //     },
  //     {
  //       // isDefault: true,
  //     }
  //   );
  // }
}
