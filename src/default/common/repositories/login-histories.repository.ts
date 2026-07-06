import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LoginHistories, User } from 'src/modules/auth/entities';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoginHistoriesRepository extends BaseRepository<LoginHistories> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(LoginHistories));
  }

  async createLoginHistory(
    data: {
      user: User;
      number: string;
      latitude?: string | null;
      longitude?: string | null;
      ipAddress?: string | null;
      status?: number;
    },
    queryRunner?: QueryRunner
  ): Promise<LoginHistories> {
    const repo = queryRunner ? queryRunner.manager.getRepository(LoginHistories) : this.repository;

    const loginHistory = repo.create({
      user: { id: Number(data.user.id) } as Partial<User>,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      ipAddress: data.ipAddress ?? null,
      status: data.status ?? 1,
    } as Partial<LoginHistories>);

    return await repo.save(loginHistory);
  }

  async findByUserId(userId: bigint, queryRunner?: QueryRunner): Promise<LoginHistories[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(LoginHistories) : this.repository;

    return await repo.find({
      where: {
        user: {
          id: userId,
        },
      } as any,
      order: {
        created_at: 'DESC',
      } as any,
    });
  }

  async findLatestByUserId(
    userId: bigint,
    queryRunner?: QueryRunner
  ): Promise<LoginHistories | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(LoginHistories) : this.repository;

    return await repo.findOne({
      where: {
        user: {
          id: userId,
        },
      } as any,
      order: {
        created_at: 'DESC',
      } as any,
    });
  }
}
