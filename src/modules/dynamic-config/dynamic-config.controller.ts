import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Put,
  Req,
  BadRequestException,
} from '@nestjs/common';
//
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DynamicConfigService } from './dynamic-config.service';
import { CreateDynamicConfigDto } from './dto/create-dynamic-config.dto';
import { EditDynamicConfigDto } from './dto/edit-dynamic-config.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';

@Controller('dynamic-config')
export class DynamicConfigController {
  constructor(private readonly configService: DynamicConfigService) {}

  /*
   * Open to Entire application, ROLE is required
   */
  @NoCache()
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Get('role')
  async getConfig(@Req() req) {
    const role = req.user.roles?.[0];

    if (!role) {
      throw new BadRequestException('Invalid User Role');
    }

    return DataSanitizer.sanitizeData(await this.configService.getConfigByUserRole(role, false));
  }

  /**
   * Fetch all configurations.
   */
  @NoCache()
  @UseGuards(JwtAuthGuard)
  // @Roles([RoleType.SUPERADMIN])
  @SkipThrottle()
  @Get()
  async getAllConfigs(@Req() req, @Query('role') role?: UserRole) {
    const isSuperAdmin =
      String(req.user.roles?.[0])?.toLowerCase() === UserRole.SUPERADMIN.toLowerCase();

    if (role) {
      return DataSanitizer.sanitizeData(
        await this.configService.getConfigByUserRole(role, isSuperAdmin)
      );
    }

    const result = await this.configService.getAllConfigs(isSuperAdmin);
    return DataSanitizer.sanitizeData(result);
  }

  /**
   * Create a new configuration for a user type.
   */
  @NoCache()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  @SkipThrottle()
  @Post('create')
  async createConfig(@Body() dto: CreateDynamicConfigDto) {
    const result = await this.configService.createConfig(dto);
    return DataSanitizer.sanitizeData(result);
  }

  /**
   * Update configuration with support for nested approval limit matrix.
   */
  @NoCache()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  @SkipThrottle()
  @Put('update')
  async updateConfig(@Req() req, @Body() dto: EditDynamicConfigDto) {
    const userId = req.user.userId;
    const result = await this.configService.updateUserRoleConfig(dto, userId);
    return DataSanitizer.sanitizeData(result);
  }
}
