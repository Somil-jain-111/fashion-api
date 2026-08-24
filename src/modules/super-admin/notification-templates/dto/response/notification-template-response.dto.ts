import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';

export class SuperAdminNotificationTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventType: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  active: boolean;

  constructor(item: any) {
    this.id = String(item.id);
    this.eventType = item.event_type;
    this.title = item.title;
    this.body = item.body;
    this.active = item.active;
  }
}

export class SuperAdminNotificationTemplateListResponseDto {
  @ApiProperty({ type: [SuperAdminNotificationTemplateResponseDto] })
  items: SuperAdminNotificationTemplateResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { items: any[]; pagination: AddressPaginationDTO }) {
    this.items = response.items.map((item) => new SuperAdminNotificationTemplateResponseDto(item));
    this.pagination = response.pagination;
  }
}
