import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

export class BaseRepository<T extends object> {
  constructor(protected readonly repository: Repository<T>) {}

  getRepository(): Repository<T> {
    return this.repository;
  }

  create(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  async save(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  async saveMany(data: DeepPartial<T>[]): Promise<T[]> {
    const entities = this.repository.create(data);
    return await this.repository.save(entities);
  }

  // async findOne(options: FindOneOptions<T>): Promise<T | null> {
  //   return await this.repository.findOne(options);
  // }

  async findOne(where: FindOptionsWhere<T>, relations?: string[]): Promise<T | null> {
    return this.repository.findOne({
      where,
      relations,
    });
  }

  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.repository.find(options);
  }

  async findById(id: string | number | bigint): Promise<T | null> {
    return await this.repository.findOne({
      where: {
        id,
      } as unknown as FindOptionsWhere<T>,
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
  async updateById(id: string | number | bigint, data: Partial<T>): Promise<boolean> {
    const result = await this.repository.update(
      {
        id,
      } as unknown as FindOptionsWhere<T>,
      data as any
    );

    return Number(result.affected) > 0;
  }

  async updateByCondition(where: FindOptionsWhere<T>, data: Partial<T>): Promise<boolean> {
    const result = await this.repository.update(where, data as any);
    return Number(result.affected) > 0;
  }

  async deleteById(id: string | number | bigint): Promise<boolean> {
    const result = await this.repository.delete(id as any);
    return Number(result.affected) > 0;
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return await this.repository.count(options);
  }

  createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository.createQueryBuilder(alias);
  }

  async update(where: any, data: any) {
    return this.repository.update(where, data);
  }
}
