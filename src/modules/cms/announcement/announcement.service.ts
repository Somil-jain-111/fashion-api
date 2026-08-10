import { Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { AnnouncementRepository, RolesRepository } from 'src/modules/auth/repository';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { AnnouncementQueryDto } from './dto/query-announcement.dto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private readonly roleRepository: RolesRepository
  ) {}

  async create(dto: CreateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const tag = 'AnnouncementService.create';

    ConsoleLogger.log('CREATE_ANNOUNCEMENT_START', {
      tag,
      data: {
        title: dto.title,
        roleIds: dto.roleIds,
      },
    });

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
      ConsoleLogger.warn('ANNOUNCEMENT_ROLES_NOT_FOUND', {
        tag,
        data: {
          missingRoleIds,
        },
      });

      throw new BusinessException(ERROR_CODES.ANNOUNCEMENT.ROLES_NOT_FOUND);
    }

    const announcement = this.announcementRepository.create({
      title: dto.title,
      message: dto.message,
      type: dto.type,
      image: dto.image ?? null,
      redirectUrl: dto.redirectUrl ?? null,
      priority: dto.priority ?? 0,
      isDismissible: dto.isDismissible ?? true,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      roles,
    });

    const savedAnnouncement = await this.announcementRepository.save(announcement);

    ConsoleLogger.log('CREATE_ANNOUNCEMENT_SUCCESS', {
      tag,
      data: {
        announcementId: savedAnnouncement.id,
      },
    });

    return new AnnouncementResponseDto(savedAnnouncement);
  }

  async findAll(
    query: AnnouncementQueryDto,
    offset: number,
    limit: number,
    role:UserRole
  ): Promise<{
    announcements: AnnouncementResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const tag = 'AnnouncementService.findAll';

    ConsoleLogger.log('ANNOUNCEMENT_FIND_ALL_START', {
      tag,
      data: { query, offset, limit },
    });

    const result = await this.announcementRepository.findAllAnnouncements(query, offset, limit,role);

    const announcements = result.rows.map(
      (announcement) => new AnnouncementResponseDto(announcement)
    );

    ConsoleLogger.log('ANNOUNCEMENT_FIND_ALL_SUCCESS', {
      tag,
      data: {
        count: announcements.length,
        totalItems: result.pagination.totalItems,
      },
    });

    return {
      announcements,
      pagination: result.pagination,
    };
  }

  async findOne(id: string): Promise<AnnouncementResponseDto> {
    const tag = 'AnnouncementService.findOne';

    const announcement = await this.announcementRepository.findById(id);

    if (!announcement) {
      ConsoleLogger.warn('ANNOUNCEMENT_NOT_FOUND', {
        tag,
        data: { id },
      });

      throw new BusinessException(ERROR_CODES.ANNOUNCEMENT.ANNOUNCEMENT_NOT_FOUND);
    }

    return new AnnouncementResponseDto(announcement);
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const tag = 'AnnouncementService.update';

    ConsoleLogger.log('ANNOUNCEMENT_UPDATE_START', {
      tag,
      data: { id, dto },
    });

    const announcement = await this.announcementRepository.findByIdOrThrow(id);

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
        ConsoleLogger.warn('ANNOUNCEMENT_ROLES_NOT_FOUND', {
          tag,
          data: { missingRoleIds },
        });

        throw new BusinessException(ERROR_CODES.ANNOUNCEMENT.ROLES_NOT_FOUND);
      }

      announcement.roles = roles;
    }

    Object.assign(announcement, {
      title: dto.title ?? announcement.title,
      message: dto.message ?? announcement.message,
      type: dto.type ?? announcement.type,
      image: dto.image ?? announcement.image,
      redirectUrl: dto.redirectUrl ?? announcement.redirectUrl,
      priority: dto.priority ?? announcement.priority,
      isDismissible: dto.isDismissible ?? announcement.isDismissible,
      isActive: dto.isActive ?? announcement.isActive,
      startDate: dto.startDate ? new Date(dto.startDate) : announcement.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : announcement.endDate,
    });

    const updatedAnnouncement = await this.announcementRepository.save(announcement);

    return new AnnouncementResponseDto(updatedAnnouncement);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = 'AnnouncementService.remove';

    ConsoleLogger.log('ANNOUNCEMENT_REMOVE_START', {
      tag,
      data: { id },
    });

    const announcement = await this.announcementRepository.findByIdOrThrow(id);

    announcement.isActive = false;

    await this.announcementRepository.save(announcement);

    return {
      message: 'Announcement deactivated successfully',
    };
  }

  async getActiveAnnouncementsByRoleIds(roleIds: string[]): Promise<AnnouncementResponseDto[]> {
    const tag = 'AnnouncementService.getActiveAnnouncementsByRoleIds';

    if (!roleIds?.length) {
      return [];
    }

    ConsoleLogger.log('ACTIVE_ANNOUNCEMENTS_FETCH_START', {
      tag,
      data: { roleIds },
    });

    const announcements =
      await this.announcementRepository.findActiveAnnouncementsByRoleIds(roleIds);

    ConsoleLogger.log('ACTIVE_ANNOUNCEMENTS_FETCH_SUCCESS', {
      tag,
      data: {
        roleIds,
        count: announcements.length,
      },
    });

    return announcements.map((announcement) => new AnnouncementResponseDto(announcement));
  }
}
