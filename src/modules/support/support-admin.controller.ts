import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SupportService } from './support.service';
import { AdminListSupportTicketsQueryDto, AdminUpdateSupportTicketDto } from './dto';

@ApiTags('Support - Admin')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/support')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Roles([UserRole.SUPERADMIN])
  @Get()
  async list(@Query() query: AdminListSupportTicketsQueryDto) {
    const response = await this.support.adminList(query);
    return DataSanitizer.sanitizeData(response);
  }

  @Roles([UserRole.SUPERADMIN])
  @Get(':id')
  async detail(@Param('id') id: string) {
    const response = await this.support.adminDetail(id);
    return DataSanitizer.sanitizeData(response);
  }

  @Roles([UserRole.SUPERADMIN])
  @Patch(':id')
  async update(@Req() request: any, @Param('id') id: string, @Body() dto: AdminUpdateSupportTicketDto) {
    const response = await this.support.adminUpdate(String(request.user.id), id, dto);
    return DataSanitizer.sanitizeData(response);
  }
}
