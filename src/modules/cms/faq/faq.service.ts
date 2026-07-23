import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { FaqRepository } from './repository/faq.repository';
import { RolesRepository } from 'src/modules/auth/repository';
import { FaqHelper } from './helpers/faq.helper';
import { CreateFaqDto } from './dto/create-faq.dto';
import { FaqResponseDto } from './dto/faq-response.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { UpdateFaqDto } from './dto/update-faq.dto';


@Injectable()
export class FaqService {
  constructor(
    private readonly faqRepository: FaqRepository,
    private readonly roleRepository: RolesRepository,
    private readonly faqHelper: FaqHelper,
  ) {}

  async create(dto: CreateFaqDto): Promise<FaqResponseDto> {
    const tag = 'FaqService.create';

    ConsoleLogger.log('FAQ_CREATE_START', {
      tag,
      data: {
        question: dto.question,
        roleIds: dto.roleIds,
      },
    });

    const url = this.faqHelper.normalizeUrl(dto.url, dto.question);

    if (url) {
      const existingUrl = await this.faqRepository.findByUrl(url);

      if (existingUrl) {
        throw new BusinessException(ERROR_CODES.FAQ.URL_ALREADY_EXISTS);
      }
    }

    const roles = await this.roleRepository.findMany({
      where: {
        id: In(dto.roleIds),
      },
    });

    const foundRoleIds = roles.map((role) => role.id.toString());

    const missingRoleIds = dto.roleIds.filter(
      (roleId) => !foundRoleIds.includes(roleId.toString()),
    );

    if (missingRoleIds.length) {
      ConsoleLogger.warn('FAQ_ROLES_NOT_FOUND', {
        tag,
        data: { missingRoleIds },
      });

      throw new BusinessException(ERROR_CODES.FAQ.ROLES_NOT_FOUND);
    }

    const faq = this.faqRepository.create({
      question: dto.question,
      answer: dto.answer,
      category: dto.category ?? null,
      url,
      displayOrder: dto.displayOrder ?? 0,
      isFeatured: dto.isFeatured ?? false,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
      roles,
    });

    const savedFaq = await this.faqRepository.save(faq);

    ConsoleLogger.log('FAQ_CREATE_SUCCESS', {
      tag,
      data: {
        faqId: savedFaq.id,
      },
    });

    return new FaqResponseDto(savedFaq);
  }

  async findAll(
    query: FaqQueryDto,
    offset: number,
    limit: number,
    userRole: UserRole,
  ): Promise<{
    faqs: FaqResponseDto[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const tag = 'FaqService.findAll';

    ConsoleLogger.log('FAQ_FIND_ALL_START', {
      tag,
      data: { query, offset, limit, userRole },
    });

    const result = await this.faqRepository.findAllFaqs(
      query,
      offset,
      limit,
      userRole,
    );

    const faqs = result.rows.map((faq) => new FaqResponseDto(faq));

    ConsoleLogger.log('FAQ_FIND_ALL_SUCCESS', {
      tag,
      data: {
        count: faqs.length,
        totalItems: result.pagination.totalItems,
      },
    });

    return {
      faqs,
      pagination: result.pagination,
    };
  }

  async findOne(id: string): Promise<FaqResponseDto> {
    const faq = await this.faqRepository.findByIdOrThrow(id);

    return new FaqResponseDto(faq);
  }

  async update(id: string, dto: UpdateFaqDto): Promise<FaqResponseDto> {
    const tag = 'FaqService.update';

    ConsoleLogger.log('FAQ_UPDATE_START', {
      tag,
      data: { id, dto },
    });

    const faq = await this.faqRepository.findByIdOrThrow(id);

    const nextUrl = dto.url
      ? this.faqHelper.normalizeUrl(dto.url)
      : faq.url;

    if (nextUrl && nextUrl !== faq.url) {
      const existingUrl = await this.faqRepository.findByUrl(nextUrl);

      if (existingUrl && existingUrl.id.toString() !== id.toString()) {
        throw new BusinessException(ERROR_CODES.FAQ.URL_ALREADY_EXISTS);
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
        (roleId) => !foundRoleIds.includes(roleId.toString()),
      );

      if (missingRoleIds.length) {
        ConsoleLogger.warn('FAQ_ROLES_NOT_FOUND', {
          tag,
          data: { missingRoleIds },
        });

        throw new BusinessException(ERROR_CODES.FAQ.ROLES_NOT_FOUND);
      }

      faq.roles = roles;
    }

    Object.assign(faq, {
      question: dto.question ?? faq.question,
      answer: dto.answer ?? faq.answer,
      category: dto.category ?? faq.category,
      url: nextUrl,
      displayOrder: dto.displayOrder ?? faq.displayOrder,
      isFeatured: dto.isFeatured ?? faq.isFeatured,
      priority: dto.priority ?? faq.priority,
      isActive: dto.isActive ?? faq.isActive,
    });

    const updatedFaq = await this.faqRepository.save(faq);

    ConsoleLogger.log('FAQ_UPDATE_SUCCESS', {
      tag,
      data: { id },
    });

    return new FaqResponseDto(updatedFaq);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = 'FaqService.remove';

    ConsoleLogger.log('FAQ_REMOVE_START', {
      tag,
      data: { id },
    });

    const faq = await this.faqRepository.findByIdOrThrow(id);

    faq.isActive = false;

    await this.faqRepository.save(faq);

    ConsoleLogger.log('FAQ_REMOVE_SUCCESS', {
      tag,
      data: { id },
    });

    return {
      message: 'FAQ deactivated successfully',
    };
  }
}