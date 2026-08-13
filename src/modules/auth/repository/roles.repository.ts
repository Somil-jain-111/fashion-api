import { DataSource, QueryRunner } from 'typeorm';
import { Roles } from 'src/modules/auth/entities';
import { Injectable } from '@nestjs/common';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { BaseRepository } from 'src/default/common/repositories';

@Injectable()
export class RolesRepository extends BaseRepository<Roles> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Roles));
  }

  async findByName(name: UserRole, queryRunner?: QueryRunner): Promise<Roles | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        name,
      } as any,
    });
  }

  async findByCode(code: string, queryRunner?: QueryRunner): Promise<Roles | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        code,
      } as any,
    });
  }
}
