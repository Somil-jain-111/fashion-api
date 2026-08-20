import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { FaqEntity } from '../entities/faq.entity';
import { FaqQueryDto } from '../dto/faq-query.dto';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { BaseRepository } from 'src/default/common/repositories';

@Injectable()
export class FaqRepository extends BaseRepository<FaqEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(FaqEntity));
  }

  async findById(id: string): Promise<FaqEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async findByIdOrThrow(id: string): Promise<FaqEntity> {
    const faq = await this.findById(id);

    if (!faq) {
      throw new BusinessException(ERROR_CODES.FAQ.NOT_FOUND);
    }

    return faq;
  }

  async findByUrl(url: string): Promise<FaqEntity | null> {
    return this.repository.findOne({
      where: { url },
      relations: ['roles'],
    });
  }

  async findAllFaqs(
    query: FaqQueryDto,
    offset: number,
    limit: number,
    userRole: UserRole
  ): Promise<{
    rows: FaqEntity[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    };
  }> {
    const queryBuilder = this.repository
      .createQueryBuilder('faq')
      .leftJoinAndSelect('faq.roles', 'role')
      .where('faq.isActive = :isActive', {
        isActive: true,
      });

    if (query.category) {
      queryBuilder.andWhere('faq.category = :category', {
        category: query.category,
      });
    }

    if (query.isFeatured !== undefined) {
      queryBuilder.andWhere('faq.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured === 'true',
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        `(
          faq.question LIKE :search
          OR faq.answer LIKE :search
          OR faq.category LIKE :search
          OR faq.url LIKE :search
        )`,
        {
          search: `%${query.search}%`,
        }
      );
    }

    const [rows, totalItems] = await queryBuilder
      .orderBy('faq.displayOrder', 'ASC')
      .addOrderBy('faq.priority', 'DESC')
      .addOrderBy('faq.createdAt', 'DESC')
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
