import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SupportService } from 'src/modules/support/support.service';
import {
  AdminListSupportTicketsQueryDto,
  AdminUpdateSupportTicketDto,
} from 'src/modules/support/dto';
import {
  SuperAdminSupportTicketResponseDto,
  SuperAdminSupportTicketListResponseDto,
} from './dto/response/support-ticket-response.dto';

/**
 * Thin proxy over the existing, already-SUPERADMIN-gated SupportService (src/modules/support) —
 * ticket list/detail/status+remarks-update is fully built and in production use at /admin/support
 * already, re-exposed here under the consolidated super-admin/* surface instead of duplicating
 * that logic.
 */
@ApiTags('Super Admin - Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/support')
export class SuperAdminSupportController {
  constructor(private readonly support: SupportService) {}

  @ApiOkResponse({ type: SuperAdminSupportTicketListResponseDto })
  @NoCache()
  @Get()
  async list(@Query() query: AdminListSupportTicketsQueryDto) {
    const response = await this.support.adminList(query);
    return DataSanitizer.sanitizeData(new SuperAdminSupportTicketListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminSupportTicketResponseDto })
  @NoCache()
  @Get(':id')
  async detail(@Param('id') id: string) {
    const response = await this.support.adminDetail(id);
    return DataSanitizer.sanitizeData(new SuperAdminSupportTicketResponseDto(response));
  }

  /**
   * Change ticket status (OPEN | IN_PROGRESS | RESOLVED) and/or add a resolution remark.
   * remarks is required when status is RESOLVED (SUP_002 if omitted).
   */
  @ApiOkResponse({ type: SuperAdminSupportTicketResponseDto })
  @NoCache()
  @Post(':id')
  async update(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: AdminUpdateSupportTicketDto
  ) {
    const response = await this.support.adminUpdate(String(request.user.id), id, dto);
    return DataSanitizer.sanitizeData(new SuperAdminSupportTicketResponseDto(response));
  }
}
