import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BaseRepository } from 'src/modules/auth/repository';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { BannerEntity } from '../entities/banner.entity';
import { BannerQueryDto } from '../dto/banner-query.dto';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class BannerRepository extends BaseRepository<BannerEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(BannerEntity));
  }

  async findById(id: string): Promise<BannerEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async findByIdOrThrow(id: string): Promise<BannerEntity> {
    const banner = await this.findById(id);

    if (!banner) {
      throw new BusinessException(ERROR_CODES.BANNER.NOT_FOUND);
    }

    return banner;
  }

  async findAllBanners(
    query: BannerQueryDto,
    offset: number,
    limit: number,
    userRole: UserRole
  ): Promise<{
    rows: BannerEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const queryBuilder = this.repository
      .createQueryBuilder('banner')
      .leftJoinAndSelect('banner.roles', 'role')
      .where('banner.isActive = :isActive', {
        isActive: true,
      })
      .andWhere('role.name = :userRole', {
        userRole,
      });

    if (query.position) {
      queryBuilder.andWhere('banner.position = :position', {
        position: query.position,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        `(
        banner.title LIKE :search
        OR banner.subtitle LIKE :search
      )`,
        {
          search: `%${query.search}%`,
        }
      );
    }

    const [rows, totalItems] = await queryBuilder
      .orderBy('banner.priority', 'DESC')
      .addOrderBy('banner.createdAt', 'DESC')
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

  async findActiveBannersByRoleIds(roleIds: string[], position?: string): Promise<BannerEntity[]> {
    const now = new Date();

    const queryBuilder = this.repository
      .createQueryBuilder('banner')
      .leftJoinAndSelect('banner.roles', 'role')
      .where('banner.isActive = :isActive', {
        isActive: true,
      })
      .andWhere('role.id IN (:...roleIds)', {
        roleIds,
      })
      .andWhere('(banner.startDate IS NULL OR banner.startDate <= :now)', {
        now,
      })
      .andWhere('(banner.endDate IS NULL OR banner.endDate >= :now)', {
        now,
      });

    if (position) {
      queryBuilder.andWhere('banner.position = :position', {
        position,
      });
    }

    return queryBuilder
      .orderBy('banner.priority', 'DESC')
      .addOrderBy('banner.createdAt', 'DESC')
      .getMany();
  }
}
