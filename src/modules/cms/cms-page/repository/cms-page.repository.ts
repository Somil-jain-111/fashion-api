import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { CmsPageEntity } from '../entities/cms-page.entity';
import { CmsPageQueryDto } from '../dto/cms-page-query.dto';
import { CmsType } from '../enum/cms-type.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { BaseRepository } from 'src/default/common/repositories';

@Injectable()
export class CmsPageRepository extends BaseRepository<CmsPageEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(CmsPageEntity));
  }

  async findById(id: string): Promise<CmsPageEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async findByIdOrThrow(id: string): Promise<CmsPageEntity> {
    const cmsPage = await this.findById(id);

    if (!cmsPage) {
      throw new BusinessException(ERROR_CODES.CMS_PAGE.NOT_FOUND);
    }

    return cmsPage;
  }

  async findByUrl(url: string): Promise<CmsPageEntity | null> {
    return this.repository.findOne({
      where: { url },
      relations: ['roles'],
    });
  }

  async findAllCmsPages(
    query: CmsPageQueryDto,
    offset: number,
    limit: number,
    userRole: UserRole
  ): Promise<{
    rows: CmsPageEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const queryBuilder = this.repository
      .createQueryBuilder('cmsPage')
      .leftJoinAndSelect('cmsPage.roles', 'role')
      .where('cmsPage.isActive = :isActive', {
        isActive: true,
      });

    if (query.type) {
      queryBuilder.andWhere('cmsPage.type = :type', {
        type: query.type,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        `(
        cmsPage.title LIKE :search
        OR cmsPage.description LIKE :search
        OR cmsPage.url LIKE :search
      )`,
        {
          search: `%${query.search}%`,
        }
      );
    }

    const [rows, totalItems] = await queryBuilder
      .orderBy('cmsPage.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      rows,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: Math.floor(offset / limit) + 1,
        pageSize: limit,
      },
    };
  }

  async findActiveCmsPagesByRoleIds(roleIds: string[], type?: CmsType): Promise<CmsPageEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('cmsPage')
      .leftJoinAndSelect('cmsPage.roles', 'role')
      .where('cmsPage.isActive = :isActive', {
        isActive: true,
      })
      .andWhere('role.id IN (:...roleIds)', {
        roleIds,
      });

    if (type) {
      queryBuilder.andWhere('cmsPage.type = :type', {
        type,
      });
    }

    return queryBuilder
      .orderBy('cmsPage.version', 'DESC')
      .addOrderBy('cmsPage.createdAt', 'DESC')
      .getMany();
  }
}
