import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { MessageResponseDto } from 'src/default/common/dto/message-response.dto';
import { BannerService } from 'src/modules/cms/banner/banner.service';
import { CreateBannerDto } from 'src/modules/cms/banner/dto/create-banner.dto';
import { UpdateBannerDto } from 'src/modules/cms/banner/dto/update-banner.dto';
import { AdminBannerQueryDto } from '../cms/dto/admin-banner-query.dto';
import { SuperAdminBannerResponseDto, SuperAdminBannerListResponseDto } from '../cms/dto/response/banner-response.dto';

/**
 * Thin proxy over the existing, already-SUPERADMIN-gated BannerService (src/modules/cms/banner) —
 * banner CRUD (including file/image validation) is fully built and in production use at
 * /banner already, so this re-exposes it under the super-admin surface instead of
 * duplicating that logic. Note: findAll only returns isActive banners (BannerRepository's
 * existing behavior), same as the app-facing endpoint.
 */
@ApiTags('Super Admin - Banners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/banners')
export class SuperAdminBannersController {
  constructor(private readonly bannerService: BannerService) {}

  @ApiOkResponse({ type: SuperAdminBannerListResponseDto })
  @Get()
  async list(@Query() query: AdminBannerQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const response = await this.bannerService.findAll(query, offset, query.limit, UserRole.SUPERADMIN);
    return DataSanitizer.sanitizeData(new SuperAdminBannerListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminBannerResponseDto })
  @Get(':id')
  async detail(@Param('id') id: string) {
    const response = await this.bannerService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminBannerResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminBannerResponseDto })
  @Post()
  async create(@Body() dto: CreateBannerDto) {
    const response = await this.bannerService.create(dto);
    return DataSanitizer.sanitizeData(new SuperAdminBannerResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminBannerResponseDto })
  @Post(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const response = await this.bannerService.update(id, dto);
    return DataSanitizer.sanitizeData(new SuperAdminBannerResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('delete/:id')
  async remove(@Param('id') id: string) {
    const response = await this.bannerService.remove(id);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }
}
