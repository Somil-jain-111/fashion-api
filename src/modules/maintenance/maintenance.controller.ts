import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceService } from './maintenance.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller('super-admin/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  async getState() {
    return DataSanitizer.sanitizeData(await this.maintenanceService.getState());
  }

  @Post()
  async updateState(@Body() dto: UpdateMaintenanceDto, @Req() req: any) {
    return DataSanitizer.sanitizeData(
      await this.maintenanceService.updateState(dto.enabled, dto.message, req.user.id)
    );
  }
}
