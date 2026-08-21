import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserMapping } from 'src/modules/auth/entities/user-mapping.entity';
import { MappingType } from 'src/default/common/enums/user-mapping.enum';

export interface ListUserMappingsFilters {
  childId?: number;
  parentId?: number;
  mappingType?: MappingType;
  active?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class SuperAdminUserMappingsRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(UserMapping);
  }

  async list(filters: ListUserMappingsFilters): Promise<{ items: UserMapping[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('mapping')
      .leftJoinAndSelect('mapping.child', 'child')
      .leftJoinAndSelect('mapping.parent', 'parent')
      .orderBy('mapping.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.childId) qb.andWhere('child.id = :childId', { childId: filters.childId });
    if (filters.parentId) qb.andWhere('parent.id = :parentId', { parentId: filters.parentId });
    if (filters.mappingType)
      qb.andWhere('mapping.mapping_type = :mappingType', { mappingType: filters.mappingType });
    if (filters.active !== undefined)
      qb.andWhere('mapping.active = :active', { active: filters.active });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findById(id: number): Promise<UserMapping | null> {
    return this.repository.findOne({ where: { id }, relations: { child: true, parent: true } });
  }

  findActiveMapping(
    childId: number,
    parentId: number,
    mappingType: MappingType
  ): Promise<UserMapping | null> {
    return this.repository.findOne({
      where: {
        child: { id: childId },
        parent: { id: parentId },
        mappingType,
        active: true,
      },
    });
  }

  create(data: Partial<UserMapping>): Promise<UserMapping> {
    return this.repository.save(this.repository.create(data));
  }

  save(mapping: UserMapping): Promise<UserMapping> {
    return this.repository.save(mapping);
  }
}
