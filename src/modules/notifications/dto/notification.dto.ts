import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NotificationCategory, NotificationChannel } from '../entities';

export class ListNotificationsQueryDto {
  @IsOptional() @IsEnum(NotificationCategory) category?: NotificationCategory;
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isRead?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class SaveNotificationTemplateDto {
  @IsString() @MaxLength(100) code!: string;
  @IsEnum(NotificationChannel) channel!: NotificationChannel;
  @IsOptional() @IsString() @MaxLength(10) locale?: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(5000) body!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) allowedVariables?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class NotificationResponseDto {
  id!: string;
  category!: string;
  title!: string;
  body!: string;
  resourceType!: string;
  resourceId!: string;
  isRead!: string;
  readAt!: string;
  createdAt!: string;
}
export class NotificationListResponseDto {
  items!: NotificationResponseDto[];
  unreadCount!: string;
  page!: string;
  limit!: string;
  total!: string;
  totalPages!: string;
}
export class NotificationCountResponseDto {
  unreadCount!: string;
}
export class NotificationActionResponseDto {
  updated!: string;
}
export class NotificationTemplateResponseDto {
  id!: string;
  code!: string;
  channel!: string;
  locale!: string;
  title!: string;
  body!: string;
  allowedVariables!: string[];
  version!: string;
  active!: string;
  createdAt!: string;
  updatedAt!: string;
}
