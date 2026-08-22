import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { AuditAction } from '../../enum/audit-action.enum';

class AuditLogPerformerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Resource type this log entry belongs to, e.g. CMS_PAGE, FAQ, BANNER' })
  module: string;

  @ApiProperty({ description: 'Id of the record that was changed' })
  entityId: string;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Full payload on CREATE, { field: { from, to } } diff on UPDATE, full snapshot on DELETE',
  })
  changes: Record<string, unknown> | null;

  @ApiProperty({ type: AuditLogPerformerDto })
  performedBy: AuditLogPerformerDto;

  @ApiProperty()
  createdAt: Date;

  constructor(log: any) {
    this.id = log.id;
    this.module = log.module;
    this.entityId = log.entityId;
    this.action = log.action;
    this.changes = log.changes ?? null;
    this.performedBy = log.performedBy;
    this.createdAt = log.createdAt;
  }
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items: AuditLogResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { items: any[]; pagination: AddressPaginationDTO }) {
    this.items = response.items.map((item) => new AuditLogResponseDto(item));
    this.pagination = response.pagination;
  }
}
