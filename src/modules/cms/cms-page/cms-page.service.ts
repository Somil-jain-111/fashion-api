import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { CmsPageRepository } from './repository/cms-page.repository';
import { RolesRepository } from 'src/modules/auth/repository';
import { CmsPageHelper } from './helpers/cms-page.helper';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { CmsPageResponseDto } from './dto/cms-page-response.dto';
import { CmsPageQueryDto } from './dto/cms-page-query.dto';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto';
import { CmsType } from './enum/cms-type.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class CmsPageService {
  constructor(
    private readonly cmsPageRepository: CmsPageRepository,
    private readonly roleRepository: RolesRepository,
    private readonly cmsPageHelper: CmsPageHelper
  ) {}

  async create(dto: CreateCmsPageDto): Promise<CmsPageResponseDto> {
    const tag = 'CmsPageService.create';

    ConsoleLogger.log('CMS_PAGE_CREATE_START', {
      tag,
      data: {
        type: dto.type,
        title: dto.title,
        roleIds: dto.roleIds,
      },
    });

    const url = this.cmsPageHelper.normalizeUrl(dto.url, dto.title);

    if (url) {
      const existingUrl = await this.cmsPageRepository.findByUrl(url);

      if (existingUrl) {
        throw new BusinessException(ERROR_CODES.CMS_PAGE.URL_ALREADY_EXISTS);
      }
    }

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
      ConsoleLogger.warn('CMS_PAGE_ROLES_NOT_FOUND', {
        tag,
        data: { missingRoleIds },
      });

      throw new BusinessException(ERROR_CODES.CMS_PAGE.ROLES_NOT_FOUND);
    }

    const cmsPage = this.cmsPageRepository.create({
      type: dto.type,
      title: dto.title,
      description: dto.description,
      url,
      version: dto.version ?? 1,
      isActive: dto.isActive ?? true,
      roles,
    });

    const savedCmsPage = await this.cmsPageRepository.save(cmsPage);

    ConsoleLogger.log('CMS_PAGE_CREATE_SUCCESS', {
      tag,
      data: {
        cmsPageId: savedCmsPage.id,
      },
    });

    return new CmsPageResponseDto(savedCmsPage);
  }

  async findAll(
    query: CmsPageQueryDto,
    offset: number,
    limit: number,
    userRole: UserRole
  ): Promise<{
    cmsPages: CmsPageResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const tag = 'CmsPageService.findAll';

    ConsoleLogger.log('CMS_PAGE_FIND_ALL_START', {
      tag,
      data: { query, offset, limit },
    });

    const result = await this.cmsPageRepository.findAllCmsPages(query, offset, limit, userRole);

    const cmsPages = result.rows.map((cmsPage) => new CmsPageResponseDto(cmsPage));

    ConsoleLogger.log('CMS_PAGE_FIND_ALL_SUCCESS', {
      tag,
      data: {
        count: cmsPages.length,
        totalItems: result.pagination.totalItems,
      },
    });

    return {
      cmsPages,
      pagination: result.pagination,
    };
  }

  async findOne(id: string): Promise<CmsPageResponseDto> {
    const cmsPage = await this.cmsPageRepository.findByIdOrThrow(id);

    return new CmsPageResponseDto(cmsPage);
  }

  async update(id: string, dto: UpdateCmsPageDto): Promise<CmsPageResponseDto> {
    const tag = 'CmsPageService.update';

    ConsoleLogger.log('CMS_PAGE_UPDATE_START', {
      tag,
      data: { id, dto },
    });

    const cmsPage = await this.cmsPageRepository.findByIdOrThrow(id);

    const nextUrl = dto.url ? this.cmsPageHelper.normalizeUrl(dto.url) : cmsPage.url;

    if (nextUrl && nextUrl !== cmsPage.url) {
      const existingUrl = await this.cmsPageRepository.findByUrl(nextUrl);

      if (existingUrl && existingUrl.id.toString() !== id.toString()) {
        throw new BusinessException(ERROR_CODES.CMS_PAGE.URL_ALREADY_EXISTS);
      }
    }

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
        ConsoleLogger.warn('CMS_PAGE_ROLES_NOT_FOUND', {
          tag,
          data: { missingRoleIds },
        });

        throw new BusinessException(ERROR_CODES.CMS_PAGE.ROLES_NOT_FOUND);
      }

      cmsPage.roles = roles;
    }

    Object.assign(cmsPage, {
      type: dto.type ?? cmsPage.type,
      title: dto.title ?? cmsPage.title,
      description: dto.description ?? cmsPage.description,
      url: nextUrl,
      version: dto.version ?? cmsPage.version,
      isActive: dto.isActive ?? cmsPage.isActive,
    });

    const updatedCmsPage = await this.cmsPageRepository.save(cmsPage);

    ConsoleLogger.log('CMS_PAGE_UPDATE_SUCCESS', {
      tag,
      data: { id },
    });

    return new CmsPageResponseDto(updatedCmsPage);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = 'CmsPageService.remove';

    ConsoleLogger.log('CMS_PAGE_REMOVE_START', {
      tag,
      data: { id },
    });

    const cmsPage = await this.cmsPageRepository.findByIdOrThrow(id);

    cmsPage.isActive = false;

    await this.cmsPageRepository.save(cmsPage);

    ConsoleLogger.log('CMS_PAGE_REMOVE_SUCCESS', {
      tag,
      data: { id },
    });

    return {
      message: 'CMS page deactivated successfully',
    };
  }

  async getActiveCmsPagesByRoleIds(
    roleIds: string[],
    type?: CmsType
  ): Promise<CmsPageResponseDto[]> {
    const tag = 'CmsPageService.getActiveCmsPagesByRoleIds';

    if (!roleIds?.length) {
      return [];
    }

    ConsoleLogger.log('ACTIVE_CMS_PAGES_FETCH_START', {
      tag,
      data: { roleIds, type },
    });

    const cmsPages = await this.cmsPageRepository.findActiveCmsPagesByRoleIds(roleIds, type);

    return cmsPages.map((cmsPage) => new CmsPageResponseDto(cmsPage));
  }
}
