import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SupportPriority, SupportTicketStatus } from '../entities/support.entity';

export class SupportAttachmentDto {
  @IsUrl({ require_protocol: true }) url!: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() mimeType?: string;
}
export class CreateSupportTicketDto {
  @Type(() => Number) @IsInt() @Min(1) categoryId!: number;
  @IsString() @IsNotEmpty() @MaxLength(200) subject!: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) message!: string;
  @IsOptional() @IsEnum(SupportPriority) priority?: SupportPriority;
  @IsOptional() @IsString() @MaxLength(80) resourceType?: string;
  @IsOptional() @IsString() @MaxLength(100) resourceId?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SupportAttachmentDto)
  attachments?: SupportAttachmentDto[];
}
export class ReplySupportTicketDto {
  @IsString() @IsNotEmpty() @MaxLength(5000) message!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SupportAttachmentDto)
  attachments?: SupportAttachmentDto[];
}
export class ListSupportTicketsQueryDto {
  @IsOptional() @IsEnum(SupportTicketStatus) status?: SupportTicketStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class AdminUpdateTicketDto {
  @IsEnum(SupportTicketStatus) status!: SupportTicketStatus;
  @IsOptional() @Type(() => Number) @IsInt() assignedTo?: number;
  @IsOptional() @IsString() @MaxLength(500) resolutionRemark?: string;
}
export class SupportAttachmentResponseDto {
  id!: string;
  url!: string;
  fileName!: string;
  mimeType!: string;
}
export class SupportMessageResponseDto {
  id!: string;
  senderId!: string;
  senderRole!: string;
  message!: string;
  createdAt!: string;
  attachments!: SupportAttachmentResponseDto[];
}
export class SupportTicketResponseDto {
  id!: string;
  ticketNumber!: string;
  categoryId!: string;
  categoryName!: string;
  subject!: string;
  status!: string;
  priority!: string;
  resourceType!: string;
  resourceId!: string;
  assignedTo!: string;
  resolutionRemark!: string;
  createdAt!: string;
  updatedAt!: string;
  messages?: SupportMessageResponseDto[];
}
export class SupportTicketListResponseDto {
  items!: SupportTicketResponseDto[];
  page!: string;
  limit!: string;
  total!: string;
  totalPages!: string;
}
export class SupportArticleResponseDto {
  id!: string;
  type!: string;
  title!: string;
  content!: string;
  url!: string;
}
export class SupportCategoryResponseDto {
  id!: string;
  code!: string;
  name!: string;
}
export class SupportOverviewResponseDto {
  documentation!: SupportArticleResponseDto[];
  contactSupport!: SupportArticleResponseDto[];
  faqs!: SupportArticleResponseDto[];
  categories!: SupportCategoryResponseDto[];
  recentTickets!: SupportTicketResponseDto[];
}
