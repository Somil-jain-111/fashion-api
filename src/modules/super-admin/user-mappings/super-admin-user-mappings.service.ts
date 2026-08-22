import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { SuperAdminUsersRepository } from '../users/repository/super-admin-users.repository';
import { SuperAdminUserMappingsRepository } from './repository/super-admin-user-mappings.repository';
import { CreateUserMappingDto, ListUserMappingsQueryDto, UpdateUserMappingDto } from './dto';

const DISTRIBUTOR_ROLES = [UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR];

@Injectable()
export class SuperAdminUserMappingsService {
  constructor(
    private readonly mappings: SuperAdminUserMappingsRepository,
    private readonly users: SuperAdminUsersRepository
  ) {}

  async list(query: ListUserMappingsQueryDto) {
    const { items, total } = await this.mappings.list({
      childId: query.childId,
      parentId: query.parentId,
      mappingType: query.mappingType,
      active: query.active,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((mapping) => this.toResponse(mapping)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async create(dto: CreateUserMappingDto) {
    const [child, parent] = await Promise.all([
      this.users.findById(dto.childId),
      this.users.findById(dto.parentId),
    ]);

    if (!child) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    if (!parent) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);

    if (child.role?.name !== UserRole.RETAILER) {
      throw new BusinessException(ERROR_CODES.SUPER_ADMIN.INVALID_MAPPING_CHILD_ROLE);
    }
    if (!DISTRIBUTOR_ROLES.includes(parent.role?.name as UserRole)) {
      throw new BusinessException(ERROR_CODES.SUPER_ADMIN.INVALID_MAPPING_PARENT_ROLE);
    }

    const existing = await this.mappings.findActiveMapping(dto.childId, dto.parentId, dto.mappingType);
    if (existing) {
      throw new BusinessException(ERROR_CODES.SUPER_ADMIN.DUPLICATE_USER_MAPPING);
    }

    const created = await this.mappings.create({
      child: { id: dto.childId } as any,
      parent: { id: dto.parentId } as any,
      mappingType: dto.mappingType,
      active: true,
    });

    return this.toResponse(await this.mappings.findById(created.id));
  }

  async update(id: number, dto: UpdateUserMappingDto) {
    const mapping = await this.mappings.findById(id);
    if (!mapping) throw new BusinessException(ERROR_CODES.SUPER_ADMIN.USER_MAPPING_NOT_FOUND);

    if (dto.parentId !== undefined) {
      const parent = await this.users.findById(dto.parentId);
      if (!parent) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
      if (!DISTRIBUTOR_ROLES.includes(parent.role?.name as UserRole)) {
        throw new BusinessException(ERROR_CODES.SUPER_ADMIN.INVALID_MAPPING_PARENT_ROLE);
      }
      mapping.parent = { id: dto.parentId } as any;
    }

    if (dto.active !== undefined) {
      mapping.active = dto.active;
    }

    const saved = await this.mappings.save(mapping);
    return this.toResponse(await this.mappings.findById(saved.id));
  }

  private toResponse(mapping: Awaited<ReturnType<SuperAdminUserMappingsRepository['findById']>>) {
    if (!mapping) return null;
    return {
      id: mapping.id,
      mappingType: mapping.mappingType,
      active: mapping.active,
      child: mapping.child && {
        id: mapping.child.id,
        firmName: mapping.child.firmName,
        mobile: mapping.child.mobile,
      },
      parent: mapping.parent && {
        id: mapping.parent.id,
        firmName: mapping.parent.firmName,
        mobile: mapping.parent.mobile,
      },
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    };
  }
}
