import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { VideoRepository } from './repository/video.repository';
import { RolesRepository } from 'src/modules/auth/repository';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { VideoQueryDto } from './dto/video-query.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly roleRepository: RolesRepository
  ) {}

  async create(dto: CreateVideoDto): Promise<VideoResponseDto> {
    const tag = 'VideoService.create';

    ConsoleLogger.log('VIDEO_CREATE_START', {
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

    const missingRoleIds = dto.roleIds.filter((roleId) => !foundRoleIds.includes(roleId.toString()));

    if (missingRoleIds.length) {
      ConsoleLogger.warn('VIDEO_ROLES_NOT_FOUND', {
        tag,
        data: { missingRoleIds },
      });

      throw new BusinessException(ERROR_CODES.VIDEO.ROLES_NOT_FOUND);
    }

    const video = this.videoRepository.create({
      title: dto.title,
      description: dto.description,
      link: dto.link,
      thumbnailUrl: dto.thumbnailUrl,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
      roles,
    });

    const savedVideo = await this.videoRepository.save(video);

    ConsoleLogger.log('VIDEO_CREATE_SUCCESS', {
      tag,
      data: {
        videoId: savedVideo.id,
      },
    });

    return new VideoResponseDto(savedVideo);
  }

  async findAll(
    query: VideoQueryDto,
    offset: number,
    limit: number
  ): Promise<{
    videos: VideoResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const tag = 'VideoService.findAll';

    ConsoleLogger.log('VIDEO_FIND_ALL_START', {
      tag,
      data: { query, offset, limit },
    });

    const result = await this.videoRepository.findAllVideos(query, offset, limit);

    const videos = result.rows.map((video) => new VideoResponseDto(video));

    ConsoleLogger.log('VIDEO_FIND_ALL_SUCCESS', {
      tag,
      data: {
        count: videos.length,
        totalItems: result.pagination.totalItems,
      },
    });

    return {
      videos,
      pagination: result.pagination,
    };
  }

  async findOne(id: string): Promise<VideoResponseDto> {
    const video = await this.videoRepository.findByIdOrThrow(id);

    return new VideoResponseDto(video);
  }

  async update(id: string, dto: UpdateVideoDto): Promise<VideoResponseDto> {
    const tag = 'VideoService.update';

    ConsoleLogger.log('VIDEO_UPDATE_START', {
      tag,
      data: { id, dto },
    });

    const video = await this.videoRepository.findByIdOrThrow(id);

    if (dto.roleIds?.length) {
      const roles = await this.roleRepository.findMany({
        where: {
          id: In(dto.roleIds),
        },
      });

      const foundRoleIds = roles.map((role) => role.id.toString());

      const missingRoleIds = dto.roleIds.filter((roleId) => !foundRoleIds.includes(roleId.toString()));

      if (missingRoleIds.length) {
        ConsoleLogger.warn('VIDEO_ROLES_NOT_FOUND', {
          tag,
          data: { missingRoleIds },
        });

        throw new BusinessException(ERROR_CODES.VIDEO.ROLES_NOT_FOUND);
      }

      video.roles = roles;
    }

    Object.assign(video, {
      title: dto.title ?? video.title,
      description: dto.description ?? video.description,
      link: dto.link ?? video.link,
      thumbnailUrl: dto.thumbnailUrl ?? video.thumbnailUrl,
      priority: dto.priority ?? video.priority,
      isActive: dto.isActive ?? video.isActive,
    });

    const updatedVideo = await this.videoRepository.save(video);

    ConsoleLogger.log('VIDEO_UPDATE_SUCCESS', {
      tag,
      data: { id },
    });

    return new VideoResponseDto(updatedVideo);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = 'VideoService.remove';

    ConsoleLogger.log('VIDEO_REMOVE_START', {
      tag,
      data: { id },
    });

    const video = await this.videoRepository.findByIdOrThrow(id);

    video.isActive = false;

    await this.videoRepository.save(video);

    ConsoleLogger.log('VIDEO_REMOVE_SUCCESS', {
      tag,
      data: { id },
    });

    return {
      message: 'Video deactivated successfully',
    };
  }

  async getActiveVideosByRoleIds(
    roleIds: string[],
    offset: number,
    limit: number,
    search?: string
  ): Promise<{
    videos: VideoResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const tag = 'VideoService.getActiveVideosByRoleIds';

    const emptyPagination = {
      totalItems: 0,
      totalPages: 0,
      currentPage: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };

    if (!roleIds?.length) {
      return { videos: [], pagination: emptyPagination };
    }

    ConsoleLogger.log('ACTIVE_VIDEOS_FETCH_START', {
      tag,
      data: { roleIds, offset, limit, search },
    });

    const result = await this.videoRepository.findActiveVideosByRoleIds(roleIds, offset, limit, search);

    return {
      videos: result.rows.map((video) => new VideoResponseDto(video)),
      pagination: result.pagination,
    };
  }
}
