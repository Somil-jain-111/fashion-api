import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
// import { UserStatusGuard } from 'src/default/common/guards/user-status.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { RolesRepository } from 'src/modules/auth/repository';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { BannerQueryDto } from './dto/banner-query.dto';
import { BannerPosition } from './enum/banner-position.enum';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Controller('banner')
@UseGuards(JwtAuthGuard)
export class BannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly roleRepository: RolesRepository
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async create(@Body() dto: CreateBannerDto) {
    const response = await this.bannerService.create(dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query() query: BannerQueryDto,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const offset = (pageNumber - 1) * pageSize;

    const response = await this.bannerService.findAll(query, offset, pageSize, req.user.role);

    return DataSanitizer.sanitizeData(response);
  }

  @Get('active')
  async getActiveBanners(@Req() req: any, @Query('position') position?: BannerPosition) {
    const roleEntity = req.user?.role ? await this.roleRepository.findByName(req.user.role) : null;
    const roleIds = roleEntity ? [roleEntity.id.toString()] : [];

    const response = await this.bannerService.getActiveBannersByRoleIds(roleIds, position);

    return DataSanitizer.sanitizeData(response);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const response = await this.bannerService.findOne(id);

    return DataSanitizer.sanitizeData(response);
  }

  @Post(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const response = await this.bannerService.update(id, dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Post('delete/:id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async remove(@Param('id') id: string) {
    const response = await this.bannerService.remove(id);

    return DataSanitizer.sanitizeData(response);
  }
}
