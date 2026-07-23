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

@NoCache()
@SkipThrottle()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @NoCache()
  @Post()
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
    const roleIds = req.user?.roles?.map((role: any) => role.id?.toString()) ?? [];

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
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    const response = await this.announcementService.update(id, dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('delete/:id')
  async remove(@Param('id') id: string) {
    const response = await this.announcementService.remove(id);
    return DataSanitizer.sanitizeData(response);
  }
}
