import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { AppVersionService } from './app-version.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { UserStatusGuard } from 'src/default/common/guards/user-status.guard';
import { AppVersionCheckQueryDto } from './dto/app-version-check-query.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@NoCache()
@Controller('app-version')
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @NoCache()
  @Get('check')
  async checkVersion(@Query() query: AppVersionCheckQueryDto) {
    const response = await this.appVersionService.checkVersion(query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Admin APIs
   */
  @NoCache()
  @Post()
  @UseGuards(JwtAuthGuard, UserStatusGuard)
  async create(@Body() dto: CreateAppVersionDto) {
    const response = await this.appVersionService.create(dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get()
  @UseGuards(JwtAuthGuard, UserStatusGuard)
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const offset = (pageNumber - 1) * pageSize;

    const response = await this.appVersionService.findAll(offset, pageSize);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get(':id')
  @UseGuards(JwtAuthGuard, UserStatusGuard)
  async findOne(@Param('id') id: string) {
    const response = await this.appVersionService.findOne(id);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post(':id')
  @UseGuards(JwtAuthGuard, UserStatusGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateAppVersionDto) {
    const response = await this.appVersionService.update(id, dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Post('delete/:id')
  @UseGuards(JwtAuthGuard, UserStatusGuard)
  async remove(@Param('id') id: string) {
    const response = await this.appVersionService.remove(id);
    return DataSanitizer.sanitizeData(response);
  }
}
