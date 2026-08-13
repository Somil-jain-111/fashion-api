import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import { UserMapping } from '../entities/user-mapping.entity';
import { BaseRepository } from 'src/default/common/repositories';
import { DistUserRoles } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class UserMappingRepository extends BaseRepository<UserMapping> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(UserMapping));
  }

  async findMappedDistributors(
    userId: number,
    distributorType?: DistUserRoles,
    queryRunner?: QueryRunner
  ): Promise<UserMapping[]> {
    return await this.getRepository(queryRunner).find({
      where: {
        child: { id: userId },
        active: true,
        ...(distributorType && {
          parent: {
            role: { name: distributorType } as any,
          },
        }),
      },
      relations: {
        parent: {
          role: true,
        },
      },
    });
  }
}
