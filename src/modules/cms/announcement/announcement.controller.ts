import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { NoCache } from 'src/default/cache/cache.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { AnnouncementQueryDto } from './dto/query-announcement.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { RolesRepository } from 'src/modules/auth/repository';

@NoCache()
@SkipThrottle()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcement')
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly roleRepository: RolesRepository
  ) {}

  @NoCache()
  @Post()
  @Roles([UserRole.SUPERADMIN])
  async create(@Body() dto: CreateAnnouncementDto) {
    const response = await this.announcementService.create(dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get()
  async findAll(@Req() req: any, @Query() query: AnnouncementQueryDto) {
    const pageNumber = Number(query.page);
    const pageSize = Number(query.limit);
    const offset = (pageNumber - 1) * pageSize;
    const response = await this.announcementService.findAll(query, offset, pageSize, req.user.role);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('active')
  async getActiveAnnouncements(@Req() req: any) {
    const roleEntity = req.user?.role ? await this.roleRepository.findByName(req.user.role) : null;
    const roleIds = roleEntity ? [roleEntity.id.toString()] : [];

    const response = await this.announcementService.getActiveAnnouncementsByRoleIds(roleIds);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const response = await this.announcementService.findOne(id);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post(':id')
  @Roles([UserRole.SUPERADMIN])
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    const response = await this.announcementService.update(id, dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('delete/:id')
  @Roles([UserRole.SUPERADMIN])
  async remove(@Param('id') id: string) {
    const response = await this.announcementService.remove(id);
    return DataSanitizer.sanitizeData(response);
  }
}
