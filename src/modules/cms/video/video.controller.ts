import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { RolesRepository } from 'src/modules/auth/repository';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { VideoQueryDto } from './dto/video-query.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { NoCache } from 'src/default/cache/cache.decorator';
import { UserStatusGuard } from 'src/default/common/guards/user-status.guard';

@NoCache()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller('videos')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly roleRepository: RolesRepository
  ) {}
  @NoCache()
  @Post()
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async create(@Body() dto: CreateVideoDto) {
    const response = await this.videoService.create(dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get()
  @UseGuards(RolesGuard)
  @Roles([UserRole.RETAILER])
  async findAll(@Query() query: VideoQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const response = await this.videoService.findAll(query, offset, limit);

    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('active')
  @UseGuards(RolesGuard)
  @Roles([UserRole.RETAILER])
  async getActiveVideos(@Req() req: any, @Query() query: VideoQueryDto) {
    const roleEntity = req.user?.role ? await this.roleRepository.findByName(req.user.role) : null;
    const roleIds = roleEntity ? [roleEntity.id.toString()] : [];

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const response = await this.videoService.getActiveVideosByRoleIds(roleIds, offset, limit, query.search);

    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.RETAILER])
  async findOne(@Param('id') id: string) {
    const response = await this.videoService.findOne(id);

    return DataSanitizer.sanitizeData(response);
  }

  @Post(':id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async update(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    const response = await this.videoService.update(id, dto);

    return DataSanitizer.sanitizeData(response);
  }

  @Post('delete/:id')
  @UseGuards(RolesGuard)
  @Roles([UserRole.SUPERADMIN])
  async remove(@Param('id') id: string) {
    const response = await this.videoService.remove(id);

    return DataSanitizer.sanitizeData(response);
  }
}
