import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StaffStatus } from '../entities';

export class InviteStaffDto {
  @IsString() @IsNotEmpty() @MaxLength(150) fullName!: string;
  @IsEmail() email!: string;
  @IsString() @Matches(/^\+?[1-9]\d{7,14}$/) mobile!: string;
  @Type(() => Number) @IsInt() @Min(1) roleId!: number;
}
export class UpdateStaffDto {
  @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) roleId?: number;
}
export class UpdateStaffStatusDto {
  @IsEnum(StaffStatus) status!: StaffStatus;
}
export class AcceptStaffInviteDto {
  @IsString() @IsNotEmpty() @MaxLength(300) token!: string;
}
export class ListStaffQueryDto {
  @IsOptional() @IsEnum(StaffStatus) status?: StaffStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class StaffRoleResponseDto {
  id!: string;
  code!: string;
  name!: string;
  description!: string;
  permissions!: string[];
}
export class StaffResponseDto {
  id!: string;
  fullName!: string;
  email!: string;
  mobile!: string;
  roleId!: string;
  roleName!: string;
  status!: string;
  lastLoginAt!: string;
  createdAt!: string;
  acceptedAt!: string;
}
export class StaffListResponseDto {
  items!: StaffResponseDto[];
  page!: string;
  limit!: string;
  total!: string;
  totalPages!: string;
}
export class StaffInviteResponseDto {
  staffId!: string;
  status!: string;
  invitationQueued!: string;
  expiresAt!: string;
}
export class StaffActionResponseDto {
  updated!: string;
  status!: string;
}
export class StaffInviteAcceptResponseDto {
  staffId!: string;
  sellerId!: string;
  roleName!: string;
  status!: string;
}
