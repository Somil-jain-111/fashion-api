import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { VideoEntity } from '../entities/video.entity';
import { VideoQueryDto } from '../dto/video-query.dto';
import { BaseRepository } from 'src/default/common/repositories';

@Injectable()
export class VideoRepository extends BaseRepository<VideoEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(VideoEntity));
  }

  async findById(id: string): Promise<VideoEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async findByIdOrThrow(id: string): Promise<VideoEntity> {
    const video = await this.findById(id);

    if (!video) {
      throw new BusinessException(ERROR_CODES.VIDEO.NOT_FOUND);
    }

    return video;
  }

  async findAllVideos(
    query: VideoQueryDto,
    offset: number,
    limit: number
  ): Promise<{
    rows: VideoEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const queryBuilder = this.repository.createQueryBuilder('video').leftJoinAndSelect('video.roles', 'role');

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('video.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    if (query.search) {
      queryBuilder.andWhere('(video.title LIKE :search OR video.description LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [rows, totalItems] = await queryBuilder
      .orderBy('video.priority', 'DESC')
      .addOrderBy('video.createdAt', 'DESC')
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

  async findActiveVideosByRoleIds(
    roleIds: string[],
    offset: number,
    limit: number,
    search?: string
  ): Promise<{
    rows: VideoEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const queryBuilder = this.repository
      .createQueryBuilder('video')
      .leftJoinAndSelect('video.roles', 'role')
      .where('video.isActive = :isActive', { isActive: true })
      .andWhere('role.id IN (:...roleIds)', { roleIds });

    if (search) {
      queryBuilder.andWhere('(video.title LIKE :search OR video.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [rows, totalItems] = await queryBuilder
      .orderBy('video.priority', 'DESC')
      .addOrderBy('video.createdAt', 'DESC')
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
