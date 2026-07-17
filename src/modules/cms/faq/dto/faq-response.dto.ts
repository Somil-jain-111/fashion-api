import { FaqEntity } from '../entities/faq.entity';

export class FaqResponseDto {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  url?: string | null;
  displayOrder: number;
  isFeatured: boolean;
  priority: number;
  roles: {
    id: string;
    name: string;
  }[];

  constructor(faq: FaqEntity) {
    this.id = faq.id?.toString();
    this.question = faq.question;
    this.answer = faq.answer;
    this.category = faq.category ?? null;
    this.url = faq.url ?? null;
    this.displayOrder = faq.displayOrder;
    this.isFeatured = faq.isFeatured;
    this.priority = faq.priority;
    this.roles =
      faq.roles?.map((role: any) => ({
        id: role.id?.toString(),
        name: role.name,
      })) ?? [];
  }
}
