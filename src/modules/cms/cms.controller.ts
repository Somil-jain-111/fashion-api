import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { CmsService } from './cms.service';
import { UserStatusGuard } from 'src/default/common/guards/user-status.guard';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { CmsHomeQueryDto } from './dto/cms-home-query.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { RolesRepository } from 'src/modules/auth/repository';

@Controller('cms')
@UseGuards(JwtAuthGuard, UserStatusGuard)
export class CmsController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly roleRepository: RolesRepository
  ) {}

  private async resolveRoleIds(role?: string): Promise<string[]> {
    if (!role) {
      return [];
    }

    const roleEntity = await this.roleRepository.findByName(role as any);

    return roleEntity ? [roleEntity.id.toString()] : [];
  }

  @Get('home')
  async getHome(@Req() req: any, @Query() query: CmsHomeQueryDto) {
    const roleIds = await this.resolveRoleIds(req.user?.role);

    const userRole = req.user?.role;

    const response = await this.cmsService.getHomeConfig(roleIds, userRole, query);

    return DataSanitizer.sanitizeData(response);
  }

  @Get('config')
  async getConfig(@Req() req: any, @Query() query: CmsHomeQueryDto) {
    const roleIds = await this.resolveRoleIds(req.user?.role);

    const userRole = req.user?.role;

    const response = await this.cmsService.getConfig(roleIds, userRole, query);

    return DataSanitizer.sanitizeData(response);
  }

  @Get('settings')
  async getSettings() {
    const response = await this.cmsService.getSettings();

    return DataSanitizer.sanitizeData(response);
  }
}
