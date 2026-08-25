import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminReportsService } from '../services/admin-reports.service';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN, UserRole.ADMIN])
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @NoCache()
  @Get('overview')
  @ResponseMessage(SUCCESS_MESSAGES.REPORTS.OVERVIEW_FETCHED)
  async overview() {
    const response = await this.adminReportsService.getOverview();
    return DataSanitizer.sanitizeData(response);
  }
}
