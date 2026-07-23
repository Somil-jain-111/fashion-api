import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { BannerRepository } from './repository/banner.repository';
import { RolesRepository } from 'src/modules/auth/repository';
import { BannerHelper } from './helpers/banner.helper';
import { BannerResponseDto } from './dto/banner-response.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { BannerRedirectType } from './enum/banner-redirect-type.enum';
import { BannerQueryDto } from './dto/banner-query.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerPosition } from './enum/banner-position.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class BannerService {
  constructor(
    private readonly bannerRepository: BannerRepository,
    private readonly roleRepository: RolesRepository,
    private readonly bannerHelper: BannerHelper
  ) {}

  async create(dto: CreateBannerDto): Promise<BannerResponseDto> {
    const tag = 'BannerService.create';

    ConsoleLogger.log('BANNER_CREATE_START', {
      tag,
      data: {
        title: dto.title,
        roleIds: dto.roleIds,
      },
    });

    this.bannerHelper.validateRedirectValue(dto.redirectType, dto.redirectValue);

    const roles = await this.roleRepository.findMany({
      where: {
        id: In(dto.roleIds),
      },
    });

    const foundRoleIds = roles.map((role) => role.id.toString());

    const missingRoleIds = dto.roleIds.filter(
      (roleId) => !foundRoleIds.includes(roleId.toString())
    );

    if (missingRoleIds.length) {
      ConsoleLogger.warn('BANNER_ROLES_NOT_FOUND', {
        tag,
        data: { missingRoleIds },
      });

      throw new BusinessException(ERROR_CODES.BANNER.ROLES_NOT_FOUND);
    }

    const redirectType = dto.redirectType ?? BannerRedirectType.NONE;

    const banner = this.bannerRepository.create({
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      image: dto.image,
      position: dto.position,
      redirectType,
      redirectValue: this.bannerHelper.normalizeRedirectValue(redirectType, dto.redirectValue),
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      roles,
    });

    const savedBanner = await this.bannerRepository.save(banner);

    ConsoleLogger.log('BANNER_CREATE_SUCCESS', {
      tag,
      data: {
        bannerId: savedBanner.id,
      },
    });

    return new BannerResponseDto(savedBanner);
  }

  async findAll(
    query: BannerQueryDto,
    offset: number,
    limit: number,
    userRole: UserRole
  ): Promise<{
    banners: BannerResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const tag = 'BannerService.findAll';

    ConsoleLogger.log('BANNER_FIND_ALL_START', {
      tag,
      data: {
        query,
        offset,
        limit,
      },
    });

    const result = await this.bannerRepository.findAllBanners(query, offset, limit, userRole);

    const banners = result.rows.map((banner) => new BannerResponseDto(banner));

    ConsoleLogger.log('BANNER_FIND_ALL_SUCCESS', {
      tag,
      data: {
        count: banners.length,
        totalItems: result.pagination.totalItems,
      },
    });

    return {
      banners,
      pagination: result.pagination,
    };
  }

  async findOne(id: string): Promise<BannerResponseDto> {
    const banner = await this.bannerRepository.findByIdOrThrow(id);

    return new BannerResponseDto(banner);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerResponseDto> {
    const tag = 'BannerService.update';

    ConsoleLogger.log('BANNER_UPDATE_START', {
      tag,
      data: {
        id,
        dto,
      },
    });

    const banner = await this.bannerRepository.findByIdOrThrow(id);

    const redirectType = dto.redirectType ?? banner.redirectType;
    const redirectValue = dto.redirectValue ?? banner.redirectValue;

    this.bannerHelper.validateRedirectValue(redirectType, redirectValue);

    if (dto.roleIds?.length) {
      const roles = await this.roleRepository.findMany({
        where: {
          id: In(dto.roleIds),
        },
      });

      const foundRoleIds = roles.map((role) => role.id.toString());

      const missingRoleIds = dto.roleIds.filter(
        (roleId) => !foundRoleIds.includes(roleId.toString())
      );

      if (missingRoleIds.length) {
        ConsoleLogger.warn('BANNER_ROLES_NOT_FOUND', {
          tag,
          data: { missingRoleIds },
        });

        throw new BusinessException(ERROR_CODES.BANNER.ROLES_NOT_FOUND);
      }

      banner.roles = roles;
    }

    Object.assign(banner, {
      title: dto.title ?? banner.title,
      subtitle: dto.subtitle ?? banner.subtitle,
      image: dto.image ?? banner.image,
      position: dto.position ?? banner.position,
      redirectType,
      redirectValue: this.bannerHelper.normalizeRedirectValue(redirectType, redirectValue),
      priority: dto.priority ?? banner.priority,
      isActive: dto.isActive ?? banner.isActive,
      startDate: dto.startDate ? new Date(dto.startDate) : banner.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : banner.endDate,
    });

    const updatedBanner = await this.bannerRepository.save(banner);

    ConsoleLogger.log('BANNER_UPDATE_SUCCESS', {
      tag,
      data: {
        id,
      },
    });

    return new BannerResponseDto(updatedBanner);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = 'BannerService.remove';

    ConsoleLogger.log('BANNER_REMOVE_START', {
      tag,
      data: { id },
    });

    const banner = await this.bannerRepository.findByIdOrThrow(id);

    banner.isActive = false;

    await this.bannerRepository.save(banner);

    ConsoleLogger.log('BANNER_REMOVE_SUCCESS', {
      tag,
      data: { id },
    });

    return {
      message: 'Banner deactivated successfully',
    };
  }

  async getActiveBannersByRoleIds(
    roleIds: string[],
    position?: BannerPosition
  ): Promise<BannerResponseDto[]> {
    const tag = 'BannerService.getActiveBannersByRoleIds';

    if (!roleIds?.length) {
      return [];
    }

    ConsoleLogger.log('ACTIVE_BANNERS_FETCH_START', {
      tag,
      data: {
        roleIds,
        position,
      },
    });

    const banners = await this.bannerRepository.findActiveBannersByRoleIds(roleIds, position);

    ConsoleLogger.log('ACTIVE_BANNERS_FETCH_SUCCESS', {
      tag,
      data: {
        count: banners.length,
      },
    });

    return banners.map((banner) => new BannerResponseDto(banner));
  }
}
