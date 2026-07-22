import {
  DeepPartial,
  FindManyOptions,
  FindOptionsWhere,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

export class BaseRepository<T extends object> {
  constructor(protected readonly repository: Repository<T>) {}

  getRepository(queryRunner?: QueryRunner): Repository<T> {
    return queryRunner
      ? queryRunner.manager.getRepository(this.repository.target)
      : this.repository;
  }

  create(data: DeepPartial<T>, queryRunner?: QueryRunner): T {
    const repo = this.getRepository(queryRunner);

    return repo.create(data);
  }

  async save(data: DeepPartial<T>, queryRunner?: QueryRunner): Promise<T> {
    const repo = this.getRepository(queryRunner);

    const entity = this.create(data, queryRunner);

    return await repo.save(entity);
  }

  async saveMany(data: DeepPartial<T>[]): Promise<T[]> {
    const entities = this.repository.create(data);
    return await this.repository.save(entities);
  }

  async findOne(where: FindOptionsWhere<T>, relations?: string[]): Promise<T | null> {
    return await this.repository.findOne({
      where,
      relations,
    });
  }

  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.repository.find(options);
  }

  async findById(id: string | number | bigint, relations?: string[]): Promise<T | null> {
    return await this.repository.findOne({
      where: {
        id,
      } as unknown as FindOptionsWhere<T>,
      relations,
    });
  }
  async findByIdWithRole(id: string | number | bigint): Promise<T | null> {
    return await this.repository.findOne({
      where: {
        id,
      } as unknown as FindOptionsWhere<T>,
      relations: ['role'],
    });
  }
  async updateById(
    id: string | number | bigint,
    data: Partial<T>,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const repo = this.getRepository(queryRunner);

    const result = await repo.update(
      {
        id,
      } as unknown as FindOptionsWhere<T>,
      data as any
    );

    return Number(result.affected) > 0;
  }

  async updateByCondition(
    where: FindOptionsWhere<T>,
    data: Partial<T>,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const repo = this.getRepository(queryRunner);

    const result = await repo.update(where, data as any);
    return Number(result.affected) > 0;
  }

  async deleteById(id: string | number | bigint, queryRunner?: QueryRunner): Promise<boolean> {
    const repo = this.getRepository(queryRunner);

    const result = await repo.delete(id as any);
    return Number(result.affected) > 0;
  }

  async count(options?: FindManyOptions<T>, queryRunner?: QueryRunner): Promise<number> {
    const repo = this.getRepository(queryRunner);

    return await repo.count(options);
  }

  createQueryBuilder(alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<T> {
    const repo = this.getRepository(queryRunner);

    return repo.createQueryBuilder(alias);
  }

  async update(where: any, data: any, queryRunner?: QueryRunner) {
    const repo = this.getRepository(queryRunner);

    return repo.update(where, data);
  }
}
