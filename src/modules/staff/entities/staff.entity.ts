import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';

export enum StaffStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REVOKED = 'REVOKED',
}

@Entity('seller_staff_roles')
export class SellerStaffRole extends BaseEntity {
  @Column({ type: 'varchar', length: 80, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) description?: string | null;
  @Column({ type: 'boolean', default: true, name: 'is_system' }) isSystem!: boolean;
  @Column({ type: 'int', default: 0, name: 'sort_order' }) sortOrder!: number;
}

@Entity('seller_staff_role_permissions')
@Index(['roleId', 'permission'], { unique: true })
export class SellerStaffRolePermission extends BaseEntity {
  @Column({ type: 'bigint', name: 'role_id' }) roleId!: number;
  @Column({ type: 'varchar', length: 100 }) permission!: string;
}

@Entity('seller_staff_memberships')
@Index(['sellerId', 'email'], { unique: true })
@Index(['sellerId', 'status'])
@Index(['inviteTokenHash'], { unique: true })
export class SellerStaffMembership extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' }) sellerId!: number;
  @Column({ type: 'bigint', nullable: true, name: 'user_id' }) userId?: number | null;
  @Column({ type: 'bigint', name: 'role_id' }) roleId!: number;
  @Column({ type: 'varchar', length: 150, name: 'full_name' }) fullName!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', length: 15 }) mobile!: string;
  @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.INVITED }) status!: StaffStatus;
  @Column({ type: 'char', length: 64, nullable: true, name: 'invite_token_hash' })
  inviteTokenHash?: string | null;
  @Column({ type: 'datetime', nullable: true, name: 'invite_expires_at' })
  inviteExpiresAt?: Date | null;
  @Column({ type: 'datetime', nullable: true, name: 'accepted_at' }) acceptedAt?: Date | null;
  @Column({ type: 'datetime', nullable: true, name: 'last_login_at' }) lastLoginAt?: Date | null;
}

@Entity('seller_staff_audits')
@Index(['sellerId', 'createdAt'])
export class SellerStaffAudit extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' }) sellerId!: number;
  @Column({ type: 'bigint', name: 'membership_id' }) membershipId!: number;
  @Column({ type: 'bigint', name: 'actor_id' }) actorId!: number;
  @Column({ type: 'varchar', length: 80 }) action!: string;
  @Column({ type: 'json', nullable: true }) changes?: Record<string, unknown> | null;
}
