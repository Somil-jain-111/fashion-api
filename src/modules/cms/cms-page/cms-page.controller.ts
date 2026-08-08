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
import { CmsPageService } from './cms-page.service';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { CmsPageQueryDto } from './dto/cms-page-query.dto';
import { CmsType } from './enum/cms-type.enum';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto';

@Controller('cms-page')
@UseGuards(JwtAuthGuard)
export class CmsPageController {
  constructor(
    private readonly cmsPageService: CmsPageService,
    private readonly roleRepository: RolesRepository
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async create(@Body() dto: CreateCmsPageDto) {
    const response = await this.cmsPageService.create(dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query() query: CmsPageQueryDto,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const offset = (pageNumber - 1) * pageSize;

    const response = await this.cmsPageService.findAll(query, offset, pageSize, req.user.role);

    return DataSanitizer.sanitizeData(response);
  }

  @Get('active')
  async getActiveCmsPages(@Req() req: any, @Query('type') type?: CmsType) {
    const roleEntity = req.user?.role ? await this.roleRepository.findByName(req.user.role) : null;
    const roleIds = roleEntity ? [roleEntity.id.toString()] : [];

    const response = await this.cmsPageService.getActiveCmsPagesByRoleIds(roleIds, type);

    return DataSanitizer.sanitizeData(response);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const response = await this.cmsPageService.findOne(id);

    return DataSanitizer.sanitizeData(response);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async update(@Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    const response = await this.cmsPageService.update(id, dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async remove(@Param('id') id: string) {
    const response = await this.cmsPageService.remove(id);

    return DataSanitizer.sanitizeData(response);
  }
}
