import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { AppVersionEntity } from '../entities/app-version.entity';
import { Platform } from '../enum/platform.enum';
import { BaseRepository } from 'src/default/common/repositories';

@Injectable()
export class AppVersionRepository extends BaseRepository<AppVersionEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(AppVersionEntity));
  }

  async findByPlatform(platform: Platform): Promise<AppVersionEntity | null> {
    return await this.repository.findOne({
      where: {
        platform,
        isActive: true,
      },
    });
  }

  async findByPlatformAnyStatus(platform: Platform): Promise<AppVersionEntity | null> {
    return await this.repository.findOne({
      where: {
        platform,
      },
    });
  }

  async findById(id: string): Promise<AppVersionEntity | null> {
    return await this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async findByIdOrThrow(id: string): Promise<AppVersionEntity> {
    const appVersion = await this.findById(id);

    if (!appVersion) {
      throw new BusinessException(ERROR_CODES.APP_VERSION.NOT_FOUND);
    }

    return appVersion;
  }

  async findMaintenanceModeConfig(): Promise<AppVersionEntity | null> {
    return await this.repository.findOne({
      where: {
        isActive: true,
        maintenanceMode: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async findAllAppVersions(
    offset: number,
    limit: number
  ): Promise<{
    rows: AppVersionEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const [rows, totalItems] = await this.repository.findAndCount({
      order: {
        createdAt: 'DESC',
      },
      skip: offset,
      take: limit,
    });

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
