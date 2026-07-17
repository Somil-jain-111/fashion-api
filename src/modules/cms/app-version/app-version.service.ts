import { Injectable } from '@nestjs/common';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';

import { AppVersionHelper } from './helpers/app-version.helper';
import { AppVersionRepository } from './repository/app-version.repository';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { AppVersionResponseDto } from './dto/app-version-response.dto';
import { AppVersionCheckQueryDto } from './dto/app-version-check-query.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

@Injectable()
export class AppVersionService {
  constructor(
    private readonly appVersionRepository: AppVersionRepository,
    private readonly appVersionHelper: AppVersionHelper
  ) {}

  async create(dto: CreateAppVersionDto): Promise<AppVersionResponseDto> {
    const tag = 'AppVersionService.create';

    ConsoleLogger.log('APP_VERSION_CREATE_START', {
      tag,
      data: {
        platform: dto.platform,
      },
    });

    const existing = await this.appVersionRepository.findByPlatformAnyStatus(dto.platform);

    if (existing) {
      throw new BusinessException(ERROR_CODES.APP_VERSION.PLATFORM_ALREADY_EXISTS);
    }

    const appVersion = this.appVersionRepository.create({
      platform: dto.platform,
      latestVersion: dto.latestVersion,
      minimumSupportedVersion: dto.minimumSupportedVersion,
      forceUpdate: dto.forceUpdate ?? false,
      storeUrl: dto.storeUrl ?? null,
      releaseNotes: dto.releaseNotes ?? null,
      isActive: dto.isActive ?? true,
      maintenanceMode: dto.maintenanceMode ?? false,
      maintenanceMessage: dto.maintenanceMessage ?? null,
    });

    const saved = await this.appVersionRepository.save(appVersion);

    ConsoleLogger.log('APP_VERSION_CREATE_SUCCESS', {
      tag,
      data: {
        id: saved.id,
        platform: saved.platform,
      },
    });

    return new AppVersionResponseDto(saved);
  }

  async findAll(
    offset: number,
    limit: number
  ): Promise<{
    appVersions: AppVersionResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const result = await this.appVersionRepository.findAllAppVersions(offset, limit);

    return {
      appVersions: result.rows.map((row) => new AppVersionResponseDto(row)),
      pagination: result.pagination,
    };
  }

  async findOne(id: string): Promise<AppVersionResponseDto> {
    const appVersion = await this.appVersionRepository.findByIdOrThrow(id);

    return new AppVersionResponseDto(appVersion);
  }

  async update(id: string, dto: UpdateAppVersionDto): Promise<AppVersionResponseDto> {
    const tag = 'AppVersionService.update';

    const appVersion = await this.appVersionRepository.findByIdOrThrow(id);

    if (dto.platform && dto.platform !== appVersion.platform) {
      const existing = await this.appVersionRepository.findByPlatformAnyStatus(dto.platform);

      if (existing && existing.id.toString() !== id.toString()) {
        throw new BusinessException(ERROR_CODES.APP_VERSION.PLATFORM_ALREADY_EXISTS);
      }
    }

    Object.assign(appVersion, {
      platform: dto.platform ?? appVersion.platform,
      latestVersion: dto.latestVersion ?? appVersion.latestVersion,
      minimumSupportedVersion: dto.minimumSupportedVersion ?? appVersion.minimumSupportedVersion,
      forceUpdate: dto.forceUpdate ?? appVersion.forceUpdate,
      storeUrl: dto.storeUrl ?? appVersion.storeUrl,
      releaseNotes: dto.releaseNotes ?? appVersion.releaseNotes,
      isActive: dto.isActive ?? appVersion.isActive,
      maintenanceMode: dto.maintenanceMode ?? appVersion.maintenanceMode,
      maintenanceMessage: dto.maintenanceMessage ?? appVersion.maintenanceMessage,
    });

    const updated = await this.appVersionRepository.save(appVersion);

    ConsoleLogger.log('APP_VERSION_UPDATE_SUCCESS', {
      tag,
      data: {
        id: updated.id,
        platform: updated.platform,
      },
    });

    return new AppVersionResponseDto(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const appVersion = await this.appVersionRepository.findByIdOrThrow(id);

    appVersion.isActive = false;

    await this.appVersionRepository.save(appVersion);

    return {
      message: 'App version deactivated successfully',
    };
  }

  async checkVersion(query: AppVersionCheckQueryDto): Promise<any> {
    const tag = 'AppVersionService.checkVersion';

    ConsoleLogger.log('APP_VERSION_CHECK_START', {
      tag,
      data: query,
    });

    const appVersion = await this.appVersionRepository.findByPlatform(query.platform);

    if (!appVersion) {
      throw new BusinessException(ERROR_CODES.APP_VERSION.NOT_FOUND);
    }

    if (appVersion.maintenanceMode) {
      throw new BusinessException({
        ...ERROR_CODES.APP_VERSION.MAINTENANCE_MODE,
        message: appVersion.maintenanceMessage ?? ERROR_CODES.APP_VERSION.MAINTENANCE_MODE.message,
      });
    }

    // If version is not provided, just return current app configuration
    if (!query.version) {
      console.log("sssss")
      return {
        message: 'App version fetched successfully',
        data: {
          platform: appVersion.platform,
          latestVersion: appVersion.latestVersion,
          minimumSupportedVersion: appVersion.minimumSupportedVersion,
          forceUpdate: appVersion.forceUpdate,
          storeUrl: appVersion.storeUrl,
          releaseNotes: this.appVersionHelper.formatReleaseNotes(appVersion.releaseNotes),
        },
      };
    }

    const updateAvailable = this.appVersionHelper.isUpdateAvailable(
      query.version,
      appVersion.latestVersion
    );

    const forceUpdate = this.appVersionHelper.isForceUpdateRequired(
      query.version,
      appVersion.minimumSupportedVersion,
      appVersion.forceUpdate
    );

    return {
      message: updateAvailable
        ? forceUpdate
          ? 'Force update required'
          : 'Update available'
        : 'Application is up to date',
      data: {
        platform: appVersion.platform,
        currentVersion: query.version,
        latestVersion: appVersion.latestVersion,
        minimumSupportedVersion: appVersion.minimumSupportedVersion,
        updateAvailable,
        forceUpdate,
        storeUrl: appVersion.storeUrl,
        releaseNotes: this.appVersionHelper.formatReleaseNotes(appVersion.releaseNotes),
      },
    };
  }
}
