import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { MessageResponseDto } from 'src/default/common/dto/message-response.dto';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { SuperAdminNotificationTemplatesService } from './super-admin-notification-templates.service';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from './dto';
import {
  SuperAdminNotificationTemplateListResponseDto,
  SuperAdminNotificationTemplateResponseDto,
} from './dto/response/notification-template-response.dto';

@ApiTags('Super Admin - Notification Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/notification-templates')
export class SuperAdminNotificationTemplatesController {
  constructor(
    private readonly templatesService: SuperAdminNotificationTemplatesService,
    private readonly auditService: AuditService
  ) {}

  @ApiOkResponse({ type: SuperAdminNotificationTemplateListResponseDto })
  @Get()
  async list(@Query() query: PaginationQueryDto) {
    const response = await this.templatesService.list(query.page, query.limit);
    return DataSanitizer.sanitizeData(new SuperAdminNotificationTemplateListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminNotificationTemplateResponseDto })
  @Get(':id')
  async detail(@Param('id') id: string) {
    const response = await this.templatesService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminNotificationTemplateResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminNotificationTemplateResponseDto })
  @Post()
  async create(@Req() request: any, @Body() dto: CreateNotificationTemplateDto) {
    const response = await this.templatesService.create(dto);
    await this.auditService.recordCreate(
      'NOTIFICATION_TEMPLATE',
      String(response.id),
      String(request.user.id),
      dto as any
    );
    return DataSanitizer.sanitizeData(new SuperAdminNotificationTemplateResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminNotificationTemplateResponseDto })
  @Post(':id')
  async update(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto
  ) {
    const before = await this.templatesService.findOne(id);
    const response = await this.templatesService.update(id, dto);
    await this.auditService.recordUpdate(
      'NOTIFICATION_TEMPLATE',
      id,
      String(request.user.id),
      before as any,
      response as any
    );
    return DataSanitizer.sanitizeData(new SuperAdminNotificationTemplateResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('delete/:id')
  async remove(@Req() request: any, @Param('id') id: string) {
    const before = await this.templatesService.findOne(id);
    const response = await this.templatesService.remove(id);
    await this.auditService.recordDelete('NOTIFICATION_TEMPLATE', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }
}
