import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DynamicConfigService } from 'src/modules/dynamic-config/dynamic-config.service';
import { CreateDynamicConfigDto } from 'src/modules/dynamic-config/dto/create-dynamic-config.dto';
import { EditDynamicConfigDto } from 'src/modules/dynamic-config/dto/edit-dynamic-config.dto';
import { SuperAdminDynamicConfigResponseDto } from './dto/response/dynamic-config-response.dto';

/**
 * Thin proxy over the existing DynamicConfigService — its create/update/list-all endpoints
 * are already SUPERADMIN-only (src/modules/dynamic-config), re-exposed here for a single
 * consolidated admin surface instead of duplicating the approval-limit-matrix logic.
 */
@ApiTags('Super Admin - Dynamic Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/dynamic-config')
export class SuperAdminDynamicConfigController {
  constructor(private readonly configService: DynamicConfigService) {}

  /**
   * Without ?role=, returns a dictionary keyed by UserRole (plus an optional
   * applicationConfig entry) — not a fixed set of properties, so it's documented as an open
   * object of SuperAdminDynamicConfigResponseDto values rather than a rigid shape that
   * wouldn't match reality. With ?role=, returns a single SuperAdminDynamicConfigResponseDto.
   */
  @ApiExtraModels(SuperAdminDynamicConfigResponseDto)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(SuperAdminDynamicConfigResponseDto) },
        { type: 'object', additionalProperties: { $ref: getSchemaPath(SuperAdminDynamicConfigResponseDto) } },
      ],
    },
  })
  @Get()
  @ResponseMessage('ALL Configuration fetched')
  async list(@Query('role') role?: UserRole) {
    if (role) {
      const response = await this.configService.getConfigByUserRole(role, true);
      return DataSanitizer.sanitizeData(new SuperAdminDynamicConfigResponseDto(response));
    }
    const response = await this.configService.getAllConfigs(true);
    return DataSanitizer.sanitizeData(response);
  }

  @ApiOkResponse({ type: SuperAdminDynamicConfigResponseDto })
  @Post('create')
  @ResponseMessage('Configuration created')
  async create(@Body() dto: CreateDynamicConfigDto) {
    const response = await this.configService.createConfig(dto);
    return DataSanitizer.sanitizeData(new SuperAdminDynamicConfigResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminDynamicConfigResponseDto })
  @Post('update')
  @ResponseMessage('Configuration updated')
  async update(@Req() req: any, @Body() dto: EditDynamicConfigDto) {
    const response = await this.configService.updateUserRoleConfig(dto, req.user.id);
    return DataSanitizer.sanitizeData(new SuperAdminDynamicConfigResponseDto(response));
  }
}
