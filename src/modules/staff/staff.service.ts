import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes, createHash } from 'crypto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRepository } from '../auth/repository';
import {
  AcceptStaffInviteDto,
  InviteStaffDto,
  ListStaffQueryDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { StaffStatus } from './entities';
import { StaffRepository } from './staff.repository';

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
@Injectable()
export class StaffService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly users: UserRepository,
    private readonly events: EventEmitter2
  ) {}
  async roles() {
    return (await this.repository.roles()).map((r) => ({
      id: String(r.id),
      code: r.code,
      name: r.name,
      description: String(r.description ?? ''),
      permissions: r.permissions.map(String),
    }));
  }
  async list(sellerId: number, q: ListStaffQueryDto) {
    const r = await this.repository.list(sellerId, q.status, q.page, q.limit);
    return {
      items: r.items.map(this.map),
      page: String(q.page),
      limit: String(q.limit),
      total: String(r.total),
      totalPages: String(Math.ceil(r.total / q.limit)),
    };
  }
  async detail(sellerId: number, id: number) {
    const s = await this.repository.detail(sellerId, id);
    if (!s) throw new BusinessException(ERROR_CODES.STAFF.NOT_FOUND);
    return this.map(s);
  }
  async invite(sellerId: number, dto: InviteStaffDto) {
    if (!(await this.repository.findRole(dto.roleId)))
      throw new BusinessException(ERROR_CODES.STAFF.ROLE_NOT_FOUND);
    const email = dto.email.trim().toLowerCase();
    if (await this.repository.findExisting(sellerId, email))
      throw new BusinessException(ERROR_CODES.STAFF.ALREADY_EXISTS);
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + INVITE_TTL_MS);
    const staff = await this.repository.create(
      {
        sellerId,
        roleId: dto.roleId,
        fullName: dto.fullName.trim(),
        email,
        mobile: dto.mobile,
        status: StaffStatus.INVITED,
        inviteTokenHash: this.hash(token),
        inviteExpiresAt: expires,
      },
      sellerId
    );
    this.events.emit('seller.staff.invited', {
      staffId: staff.id,
      sellerId,
      email,
      token,
      expiresAt: expires,
    });
    return {
      staffId: String(staff.id),
      status: String(staff.status),
      invitationQueued: 'true',
      expiresAt: expires.toISOString(),
    };
  }
  async update(sellerId: number, id: number, dto: UpdateStaffDto) {
    const staff = await this.entity(sellerId, id);
    if (dto.roleId && !(await this.repository.findRole(dto.roleId)))
      throw new BusinessException(ERROR_CODES.STAFF.ROLE_NOT_FOUND);
    await this.repository.update(
      staff,
      {
        ...(dto.fullName && { fullName: dto.fullName.trim() }),
        ...(dto.roleId && { roleId: dto.roleId }),
      },
      sellerId,
      'UPDATED'
    );
    return this.detail(sellerId, id);
  }
  async status(sellerId: number, id: number, status: StaffStatus) {
    const staff = await this.entity(sellerId, id);
    if (![StaffStatus.ACTIVE, StaffStatus.INACTIVE, StaffStatus.REVOKED].includes(status))
      throw new BusinessException(ERROR_CODES.VALIDATION.INVALID_PAYLOAD);
    await this.repository.update(staff, { status }, sellerId, 'STATUS_CHANGED');
    return { updated: 'true', status: String(status) };
  }
  async resend(sellerId: number, id: number) {
    const staff = await this.entity(sellerId, id);
    if (staff.status !== StaffStatus.INVITED)
      throw new BusinessException(ERROR_CODES.STAFF.INVALID_INVITATION);
    const token = randomBytes(32).toString('base64url'),
      expires = new Date(Date.now() + INVITE_TTL_MS);
    await this.repository.update(
      staff,
      { inviteTokenHash: this.hash(token), inviteExpiresAt: expires },
      sellerId,
      'INVITE_RESENT'
    );
    this.events.emit('seller.staff.invited', {
      staffId: id,
      sellerId,
      email: staff.email,
      token,
      expiresAt: expires,
    });
    return {
      staffId: String(id),
      status: String(staff.status),
      invitationQueued: 'true',
      expiresAt: expires.toISOString(),
    };
  }
  async accept(userId: number, dto: AcceptStaffInviteDto) {
    const staff = await this.repository.findByTokenHash(this.hash(dto.token));
    if (!staff || !staff.inviteExpiresAt || staff.inviteExpiresAt <= new Date())
      throw new BusinessException(ERROR_CODES.STAFF.INVALID_INVITATION);
    const user = await this.users.findProfileSummaryById(userId);
    if (
      !user ||
      (user.email?.toLowerCase() !== staff.email.toLowerCase() && user.mobile !== staff.mobile)
    )
      throw new BusinessException(ERROR_CODES.STAFF.INVITATION_IDENTITY_MISMATCH);
    await this.repository.update(
      staff,
      {
        userId,
        status: StaffStatus.ACTIVE,
        acceptedAt: new Date(),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
      userId,
      'INVITE_ACCEPTED'
    );
    const role = await this.repository.findRole(staff.roleId);
    return {
      staffId: String(staff.id),
      sellerId: String(staff.sellerId),
      roleName: String(role?.name ?? ''),
      status: String(StaffStatus.ACTIVE),
    };
  }
  private entity = async (sellerId: number, id: number) => {
    const s = await this.repository.findEntity(sellerId, id);
    if (!s) throw new BusinessException(ERROR_CODES.STAFF.NOT_FOUND);
    return s;
  };
  private hash = (token: string) => createHash('sha256').update(token).digest('hex');
  private map = (s: any) => ({
    id: String(s.id),
    fullName: String(s.fullName),
    email: String(s.email),
    mobile: String(s.mobile),
    roleId: String(s.roleId),
    roleName: String(s.roleName),
    status: String(s.status),
    lastLoginAt:
      s.lastLoginAt instanceof Date ? s.lastLoginAt.toISOString() : String(s.lastLoginAt ?? ''),
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt ?? ''),
    acceptedAt:
      s.acceptedAt instanceof Date ? s.acceptedAt.toISOString() : String(s.acceptedAt ?? ''),
  });
}
