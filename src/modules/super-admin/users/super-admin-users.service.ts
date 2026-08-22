import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { SuperAdminUsersRepository } from './repository/super-admin-users.repository';
import { ListUsersQueryDto } from './dto';

@Injectable()
export class SuperAdminUsersService {
  constructor(private readonly users: SuperAdminUsersRepository) {}

  async list(query: ListUsersQueryDto) {
    const { items, total } = await this.users.list({
      role: query.role,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((user) => ({
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        firmName: user.firmName,
        mobile: user.mobile,
        email: user.email,
        role: user.role?.name,
        status: user.status,
        points: Number(user.points ?? 0),
        createdAt: user.createdAt,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async detail(id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);

    const [addresses, kyc, mappedDistributors, mappedRetailers] = await Promise.all([
      this.users.findAddressesByUserId(id),
      this.users.findKycByUserId(id),
      this.users.findMappingsAsChild(id),
      this.users.findMappingsAsParent(id),
    ]);

    return {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      firmName: user.firmName,
      privateName: user.privateName,
      mobile: user.mobile,
      email: user.email,
      role: user.role?.name,
      status: user.status,
      points: Number(user.points ?? 0),
      dateOfBirth: user.date_of_birth,
      createdAt: user.createdAt,
      addresses: addresses.map((address) => ({
        id: address.id,
        name: address.name,
        mobile: address.mobile,
        addressLine1: address.address_line_1,
        addressLine2: address.address_line_2,
        landmark: address.landmark,
        pincode: address.pincode,
        cityName: address.city_name,
        stateName: address.state_name,
        addressType: address.addressType,
      })),
      kyc: kyc.map((record) => ({
        id: record.id,
        type: record.type,
        status: record.status,
        verifiedName: record.verifiedName,
        maskedDocumentNumber: record.maskedDocumentNumber,
        failureReason: record.failureReason,
        createdAt: record.createdAt,
      })),
      mappedDistributors: mappedDistributors.map((mapping) => ({
        mappingId: mapping.id,
        mappingType: mapping.mappingType,
        active: mapping.active,
        distributorId: mapping.parent?.id,
        distributorName: mapping.parent?.firmName ?? mapping.parent?.username,
        distributorRole: mapping.parent?.role?.name,
      })),
      mappedRetailers: mappedRetailers.map((mapping) => ({
        mappingId: mapping.id,
        mappingType: mapping.mappingType,
        active: mapping.active,
        retailerId: mapping.child?.id,
        retailerName: mapping.child?.firmName ?? mapping.child?.username,
        retailerRole: mapping.child?.role?.name,
      })),
    };
  }
}
