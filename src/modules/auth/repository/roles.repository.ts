import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Roles } from 'src/modules/auth/entities';
import { Injectable } from '@nestjs/common';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class RolesRepository extends BaseRepository<Roles> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Roles));
  }

  async findByName(name: UserRole, queryRunner?: QueryRunner): Promise<Roles | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Roles) : this.repository;

    return await repo.findOne({
      where: {
        name,
      } as any,
    });
  }

  async findByCode(code: string, queryRunner?: QueryRunner): Promise<Roles | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Roles) : this.repository;

    return await repo.findOne({
      where: {
        code,
      } as any,
    });
  }

  async createRole(
    data: {
      name: string;
      code?: string;
      user_type?: string;
      active?: boolean;
    },
    queryRunner?: QueryRunner
  ): Promise<Roles> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Roles) : this.repository;

    const role = repo.create({
      name: data.name,
      code: data.code,
      user_type: data.user_type,
      active: data.active ?? true,
    } as Partial<Roles>);

    return await repo.save(role);
  }
}
