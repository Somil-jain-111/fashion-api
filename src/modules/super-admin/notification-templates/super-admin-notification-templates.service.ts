import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { AddressPaginationDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { NotificationTemplateRepository } from 'src/modules/notifications/repository/notification-template.repository';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from './dto';

@Injectable()
export class SuperAdminNotificationTemplatesService {
  constructor(private readonly templates: NotificationTemplateRepository) {}

  async list(page: number, limit: number) {
    const { items, total } = await this.templates.findAllPaginated(page, limit);
    return {
      items,
      pagination: new AddressPaginationDTO(total, Math.ceil(total / limit), page, limit),
    };
  }

  async findOne(id: string) {
    const template = await this.templates.findById(id);
    if (!template) {
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_TEMPLATE_NOT_FOUND);
    }
    return template;
  }

  async create(dto: CreateNotificationTemplateDto) {
    const existing = await this.templates.findByEventType(dto.eventType);
    if (existing) {
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_TEMPLATE_ALREADY_EXISTS);
    }
    return this.templates.save({
      event_type: dto.eventType,
      title: dto.title,
      body: dto.body,
    });
  }

  async update(id: string, dto: UpdateNotificationTemplateDto) {
    const template = await this.findOne(id);
    if (dto.title !== undefined) template.title = dto.title;
    if (dto.body !== undefined) template.body = dto.body;
    return this.templates.save(template);
  }

  async remove(id: string) {
    const template = await this.findOne(id);
    template.active = false;
    await this.templates.save(template);
    return { message: 'Notification template deleted successfully' };
  }
}
