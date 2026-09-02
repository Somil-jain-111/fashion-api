import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  SellerStaffAudit,
  SellerStaffMembership,
  SellerStaffRole,
  SellerStaffRolePermission,
  StaffStatus,
} from './entities';

@Injectable()
export class StaffRepository {
  constructor(private readonly dataSource: DataSource) {}
  async roles() {
    const roles = await this.dataSource
      .getRepository(SellerStaffRole)
      .find({ where: { active: true }, order: { sortOrder: 'ASC' } });
    const ids = roles.map((r) => r.id);
    const permissions = ids.length
      ? await this.dataSource
          .getRepository(SellerStaffRolePermission)
          .createQueryBuilder('p')
          .select(['p.roleId', 'p.permission'])
          .where('p.roleId IN (:...ids)', { ids })
          .getMany()
      : [];
    return roles.map((r) => ({
      ...r,
      permissions: permissions
        .filter((p) => Number(p.roleId) === Number(r.id))
        .map((p) => p.permission),
    }));
  }
  findRole(id: number) {
    return this.dataSource.getRepository(SellerStaffRole).findOne({ where: { id, active: true } });
  }
  findExisting(sellerId: number, email: string) {
    return this.dataSource
      .getRepository(SellerStaffMembership)
      .findOne({ where: { sellerId, email } });
  }
  async create(data: Partial<SellerStaffMembership>, actorId: number) {
    return this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(SellerStaffMembership);
      const staff = await repo.save(repo.create(data));
      await m.getRepository(SellerStaffAudit).save({
        sellerId: staff.sellerId,
        membershipId: staff.id,
        actorId,
        action: 'INVITED',
        changes: { roleId: staff.roleId, email: staff.email },
      });
      return staff;
    });
  }
  async list(sellerId: number, status: StaffStatus | undefined, page: number, limit: number) {
    const qb = this.dataSource
      .getRepository(SellerStaffMembership)
      .createQueryBuilder('s')
      .leftJoin(SellerStaffRole, 'r', 'r.id=s.role_id')
      .select([
        's.id AS id',
        's.full_name AS fullName',
        's.email AS email',
        's.mobile AS mobile',
        's.role_id AS roleId',
        'r.name AS roleName',
        's.status AS status',
        's.accepted_at AS acceptedAt',
        's.created_at AS createdAt',
      ])
      .addSelect(
        '(SELECT MAX(lh.created_at) FROM login_histories lh WHERE lh.user_id=s.user_id)',
        'lastLoginAt'
      )
      .where('s.seller_id=:sellerId', { sellerId });
    if (status) qb.andWhere('s.status=:status', { status });
    const total = await qb.getCount();
    return {
      items: await qb
        .orderBy('s.created_at', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany(),
      total,
    };
  }
  detail(sellerId: number, id: number) {
    return this.dataSource
      .getRepository(SellerStaffMembership)
      .createQueryBuilder('s')
      .leftJoin(SellerStaffRole, 'r', 'r.id=s.role_id')
      .select([
        's.id AS id',
        's.full_name AS fullName',
        's.email AS email',
        's.mobile AS mobile',
        's.role_id AS roleId',
        'r.name AS roleName',
        's.status AS status',
        's.accepted_at AS acceptedAt',
        's.created_at AS createdAt',
      ])
      .addSelect(
        '(SELECT MAX(lh.created_at) FROM login_histories lh WHERE lh.user_id=s.user_id)',
        'lastLoginAt'
      )
      .where('s.id=:id AND s.seller_id=:sellerId', { id, sellerId })
      .getRawOne();
  }
  findEntity(sellerId: number, id: number) {
    return this.dataSource
      .getRepository(SellerStaffMembership)
      .findOne({ where: { id, sellerId } });
  }
  findByTokenHash(hash: string) {
    return this.dataSource
      .getRepository(SellerStaffMembership)
      .findOne({ where: { inviteTokenHash: hash, status: StaffStatus.INVITED } });
  }
  async update(
    staff: SellerStaffMembership,
    data: Partial<SellerStaffMembership>,
    actorId: number,
    action: string
  ) {
    return this.dataSource.transaction(async (m) => {
      await m.getRepository(SellerStaffMembership).update(staff.id, data);
      await m
        .getRepository(SellerStaffAudit)
        .save({ sellerId: staff.sellerId, membershipId: staff.id, actorId, action, changes: data });
    });
  }
}
