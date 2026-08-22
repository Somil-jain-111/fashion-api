import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { SupportIssueType } from 'src/modules/support/enum/support-issue-type.enum';
import { SupportTicketStatus } from 'src/modules/support/enum/support-ticket-status.enum';

class SupportTicketAttachmentRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;
}

class SupportTicketAdminRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false, nullable: true })
  firmName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  username?: string | null;
}

export class SuperAdminSupportTicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ticket_no: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: SupportIssueType })
  issue_type: SupportIssueType;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: SupportTicketStatus })
  status: SupportTicketStatus;

  @ApiProperty({ required: false, nullable: true })
  resolution_remarks?: string | null;

  @ApiProperty({ required: false, nullable: true })
  updated_by?: string | null;

  @ApiProperty({ type: [SupportTicketAttachmentRefDto] })
  attachments: SupportTicketAttachmentRefDto[];

  @ApiProperty({ type: SupportTicketAdminRefDto, required: false, nullable: true })
  updatedByAdmin?: SupportTicketAdminRefDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(ticket: any) {
    this.id = ticket.id;
    this.ticket_no = ticket.ticket_no;
    this.user_id = ticket.user_id;
    this.issue_type = ticket.issue_type;
    this.description = ticket.description;
    this.status = ticket.status;
    this.resolution_remarks = ticket.resolution_remarks ?? null;
    this.updated_by = ticket.updated_by ?? null;
    this.attachments = ticket.attachments ?? [];
    this.updatedByAdmin = ticket.updatedByAdmin ?? null;
    this.createdAt = ticket.createdAt;
    this.updatedAt = ticket.updatedAt;
  }
}

export class SuperAdminSupportTicketListResponseDto {
  @ApiProperty({ type: [SuperAdminSupportTicketResponseDto] })
  items: SuperAdminSupportTicketResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { items: any[]; pagination: AddressPaginationDTO }) {
    this.items = response.items.map((item) => new SuperAdminSupportTicketResponseDto(item));
    this.pagination = response.pagination;
  }
}
