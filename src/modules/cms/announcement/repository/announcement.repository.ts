import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { BaseRepository } from 'src/modules/auth/repository';
import { AnnouncementEntity } from '../entities/announcement.entity';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { AnnouncementQueryDto } from '../dto/query-announcement.dto';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class AnnouncementRepository extends BaseRepository<AnnouncementEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(AnnouncementEntity));
  }

  async findActiveAnnouncementsByRoleIds(roleIds: string[]): Promise<AnnouncementEntity[]> {
    const now = new Date();

    return this.repository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.roles', 'role')
      .where('announcement.isActive = :isActive', {
        isActive: true,
      })
      .andWhere('role.id IN (:...roleIds)', {
        roleIds,
      })
      .andWhere('(announcement.startDate IS NULL OR announcement.startDate <= :now)', { now })
      .andWhere('(announcement.endDate IS NULL OR announcement.endDate >= :now)', { now })
      .orderBy('announcement.priority', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async findAllWithPagination(offset: number, limit: number) {
    const [rows, count] = await this.repository.findAndCount({
      relations: ['roles'],
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
      skip: offset,
      take: limit,
    });

    return {
      rows,
      pagination: {
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        limit,
      },
    };
  }

  async findByIdOrThrow(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.findById(id);

    if (!announcement) {
      throw new BusinessException(ERROR_CODES.ANNOUNCEMENT.ANNOUNCEMENT_NOT_FOUND);
    }

    return announcement;
  }

  async findAllAnnouncements(
    query: AnnouncementQueryDto,
    offset: number,
    limit: number,
    role: UserRole
  ): Promise<{
    rows: AnnouncementEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const queryBuilder = this.repository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.roles', 'role')
      .where('announcement.isActive = :isActive', {
        isActive: true,
      });

    if (query.type) {
      queryBuilder.andWhere('announcement.type = :type', {
        type: query.type,
      });
    }

    if (role) {
      queryBuilder.andWhere('role.name = :role', {
        role,
      });
    }

    const [rows, totalItems] = await queryBuilder
      .orderBy('announcement.priority', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC')
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
}
