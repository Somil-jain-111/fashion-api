import { ApiProperty } from '@nestjs/swagger';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { RoleRefDto } from './role-ref.dto';

export class SuperAdminFaqResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  answer: string;

  @ApiProperty({ required: false, nullable: true })
  category?: string | null;

  @ApiProperty({ required: false, nullable: true })
  url?: string | null;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  priority: number;

  @ApiProperty({ type: [RoleRefDto] })
  roles: RoleRefDto[];

  constructor(faq: any) {
    this.id = faq.id;
    this.question = faq.question;
    this.answer = faq.answer;
    this.category = faq.category ?? null;
    this.url = faq.url ?? null;
    this.displayOrder = faq.displayOrder;
    this.isFeatured = faq.isFeatured;
    this.priority = faq.priority;
    this.roles = faq.roles ?? [];
  }
}

export class SuperAdminFaqListResponseDto {
  @ApiProperty({ type: [SuperAdminFaqResponseDto] })
  items: SuperAdminFaqResponseDto[];

  @ApiProperty({ type: AddressPaginationDTO })
  pagination: AddressPaginationDTO;

  constructor(response: { faqs: any[]; pagination: any }) {
    this.items = response.faqs.map((faq) => new SuperAdminFaqResponseDto(faq));
    this.pagination = response.pagination;
  }
}
