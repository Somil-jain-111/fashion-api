import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { MessageResponseDto } from 'src/default/common/dto/message-response.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { ListAuditLogsQueryDto } from 'src/modules/audit/dto';
import { AuditLogListResponseDto } from 'src/modules/audit/dto/response/audit-log-response.dto';

import { CmsPageService } from 'src/modules/cms/cms-page/cms-page.service';
import { CreateCmsPageDto } from 'src/modules/cms/cms-page/dto/create-cms-page.dto';
import { UpdateCmsPageDto } from 'src/modules/cms/cms-page/dto/update-cms-page.dto';

import { FaqService } from 'src/modules/cms/faq/faq.service';
import { CreateFaqDto } from 'src/modules/cms/faq/dto/create-faq.dto';
import { UpdateFaqDto } from 'src/modules/cms/faq/dto/update-faq.dto';

import { AnnouncementService } from 'src/modules/cms/announcement/announcement.service';
import { CreateAnnouncementDto } from 'src/modules/cms/announcement/dto/create-announcement.dto';
import { UpdateAnnouncementDto } from 'src/modules/cms/announcement/dto/update-announcement.dto';
import { AnnouncementQueryDto } from 'src/modules/cms/announcement/dto/query-announcement.dto';

import { BannerService } from 'src/modules/cms/banner/banner.service';
import { CreateBannerDto } from 'src/modules/cms/banner/dto/create-banner.dto';
import { UpdateBannerDto } from 'src/modules/cms/banner/dto/update-banner.dto';

import { AppVersionService } from 'src/modules/cms/app-version/app-version.service';
import { CreateAppVersionDto } from 'src/modules/cms/app-version/dto/create-app-version.dto';
import { UpdateAppVersionDto } from 'src/modules/cms/app-version/dto/update-app-version.dto';

import { VideoService } from 'src/modules/cms/video/video.service';
import { CreateVideoDto } from 'src/modules/cms/video/dto/create-video.dto';
import { UpdateVideoDto } from 'src/modules/cms/video/dto/update-video.dto';

import { AdminCmsPageQueryDto } from './dto/admin-cms-page-query.dto';
import { AdminFaqQueryDto } from './dto/admin-faq-query.dto';
import { AdminBannerQueryDto } from './dto/admin-banner-query.dto';
import { AdminVideoQueryDto } from './dto/admin-video-query.dto';
import { SuperAdminCmsPageResponseDto, SuperAdminCmsPageListResponseDto } from './dto/response/page-response.dto';
import { SuperAdminFaqResponseDto, SuperAdminFaqListResponseDto } from './dto/response/faq-response.dto';
import {
  SuperAdminAnnouncementResponseDto,
  SuperAdminAnnouncementListResponseDto,
} from './dto/response/announcement-response.dto';
import { SuperAdminBannerResponseDto, SuperAdminBannerListResponseDto } from './dto/response/banner-response.dto';
import {
  SuperAdminAppVersionResponseDto,
  SuperAdminAppVersionListResponseDto,
} from './dto/response/app-version-response.dto';
import { SuperAdminVideoResponseDto, SuperAdminVideoListResponseDto } from './dto/response/video-response.dto';

/**
 * Thin proxy over the existing cms-page/faq/announcement/banner/app-version/video services
 * (src/modules/cms) — re-exposed under the consolidated super-admin/* surface. GET + POST
 * only, no PATCH/DELETE: update is POST /:id, delete is POST /delete/:id, same convention
 * already used by SuperAdminBannersController / the announcement module's own controller.
 *
 * Every create/update/delete is logged via AuditService: who did it, and for updates, which
 * fields changed (from -> to). GET /history reads that log back, filterable by module,
 * entityId, action, performedBy, fromDate, toDate.
 */
@ApiTags('Super Admin - CMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/cms')
export class SuperAdminCmsController {
  constructor(
    private readonly cmsPageService: CmsPageService,
    private readonly faqService: FaqService,
    private readonly announcementService: AnnouncementService,
    private readonly bannerService: BannerService,
    private readonly appVersionService: AppVersionService,
    private readonly videoService: VideoService,
    private readonly auditService: AuditService
  ) {}

  // ---- Change history ----

  @ApiOkResponse({ type: AuditLogListResponseDto })
  @Get('history')
  async listHistory(@Query() query: ListAuditLogsQueryDto) {
    const response = await this.auditService.list(query);
    return DataSanitizer.sanitizeData(new AuditLogListResponseDto(response));
  }

  // ---- CMS Pages ----

  @ApiOkResponse({ type: SuperAdminCmsPageListResponseDto })
  @Get('pages')
  async listPages(@Query() query: AdminCmsPageQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const response = await this.cmsPageService.findAll(
      query,
      offset,
      query.limit,
      UserRole.SUPERADMIN
    );
    return DataSanitizer.sanitizeData(new SuperAdminCmsPageListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminCmsPageResponseDto })
  @Get('pages/:id')
  async getPage(@Param('id') id: string) {
    const response = await this.cmsPageService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminCmsPageResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminCmsPageResponseDto })
  @Post('pages')
  async createPage(@Req() request: any, @Body() dto: CreateCmsPageDto) {
    const response = await this.cmsPageService.create(dto);
    await this.auditService.recordCreate('CMS_PAGE', String(response.id), String(request.user.id), dto as any);
    return DataSanitizer.sanitizeData(new SuperAdminCmsPageResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminCmsPageResponseDto })
  @Post('pages/:id')
  async updatePage(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    const before = await this.cmsPageService.findOne(id);
    const response = await this.cmsPageService.update(id, dto);
    await this.auditService.recordUpdate('CMS_PAGE', id, String(request.user.id), before as any, response as any);
    return DataSanitizer.sanitizeData(new SuperAdminCmsPageResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('pages/delete/:id')
  async deletePage(@Req() request: any, @Param('id') id: string) {
    const before = await this.cmsPageService.findOne(id);
    const response = await this.cmsPageService.remove(id);
    await this.auditService.recordDelete('CMS_PAGE', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }

  // ---- FAQs ----

  @ApiOkResponse({ type: SuperAdminFaqListResponseDto })
  @Get('faqs')
  async listFaqs(@Query() query: AdminFaqQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const response = await this.faqService.findAll(query, offset, query.limit, UserRole.SUPERADMIN);
    return DataSanitizer.sanitizeData(new SuperAdminFaqListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminFaqResponseDto })
  @Get('faqs/:id')
  async getFaq(@Param('id') id: string) {
    const response = await this.faqService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminFaqResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminFaqResponseDto })
  @Post('faqs')
  async createFaq(@Req() request: any, @Body() dto: CreateFaqDto) {
    const response = await this.faqService.create(dto);
    await this.auditService.recordCreate('FAQ', String(response.id), String(request.user.id), dto as any);
    return DataSanitizer.sanitizeData(new SuperAdminFaqResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminFaqResponseDto })
  @Post('faqs/:id')
  async updateFaq(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateFaqDto) {
    const before = await this.faqService.findOne(id);
    const response = await this.faqService.update(id, dto);
    await this.auditService.recordUpdate('FAQ', id, String(request.user.id), before as any, response as any);
    return DataSanitizer.sanitizeData(new SuperAdminFaqResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('faqs/delete/:id')
  async deleteFaq(@Req() request: any, @Param('id') id: string) {
    const before = await this.faqService.findOne(id);
    const response = await this.faqService.remove(id);
    await this.auditService.recordDelete('FAQ', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }

  // ---- Announcements ----

  @ApiOkResponse({ type: SuperAdminAnnouncementListResponseDto })
  @Get('announcements')
  async listAnnouncements(@Query() query: AnnouncementQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const response = await this.announcementService.findAll(
      query,
      offset,
      query.limit,
      UserRole.SUPERADMIN
    );
    return DataSanitizer.sanitizeData(new SuperAdminAnnouncementListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminAnnouncementResponseDto })
  @Get('announcements/:id')
  async getAnnouncement(@Param('id') id: string) {
    const response = await this.announcementService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminAnnouncementResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminAnnouncementResponseDto })
  @Post('announcements')
  async createAnnouncement(@Req() request: any, @Body() dto: CreateAnnouncementDto) {
    const response = await this.announcementService.create(dto);
    await this.auditService.recordCreate('ANNOUNCEMENT', String(response.id), String(request.user.id), dto as any);
    return DataSanitizer.sanitizeData(new SuperAdminAnnouncementResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminAnnouncementResponseDto })
  @Post('announcements/:id')
  async updateAnnouncement(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    const before = await this.announcementService.findOne(id);
    const response = await this.announcementService.update(id, dto);
    await this.auditService.recordUpdate(
      'ANNOUNCEMENT',
      id,
      String(request.user.id),
      before as any,
      response as any
    );
    return DataSanitizer.sanitizeData(new SuperAdminAnnouncementResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('announcements/delete/:id')
  async deleteAnnouncement(@Req() request: any, @Param('id') id: string) {
    const before = await this.announcementService.findOne(id);
    const response = await this.announcementService.remove(id);
    await this.auditService.recordDelete('ANNOUNCEMENT', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }

  // ---- Banners ----

  @ApiOkResponse({ type: SuperAdminBannerListResponseDto })
  @Get('banners')
  async listBanners(@Query() query: AdminBannerQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const response = await this.bannerService.findAll(query, offset, query.limit, UserRole.SUPERADMIN);
    return DataSanitizer.sanitizeData(new SuperAdminBannerListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminBannerResponseDto })
  @Get('banners/:id')
  async getBanner(@Param('id') id: string) {
    const response = await this.bannerService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminBannerResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminBannerResponseDto })
  @Post('banners')
  async createBanner(@Req() request: any, @Body() dto: CreateBannerDto) {
    const response = await this.bannerService.create(dto);
    await this.auditService.recordCreate('BANNER', String(response.id), String(request.user.id), dto as any);
    return DataSanitizer.sanitizeData(new SuperAdminBannerResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminBannerResponseDto })
  @Post('banners/:id')
  async updateBanner(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const before = await this.bannerService.findOne(id);
    const response = await this.bannerService.update(id, dto);
    await this.auditService.recordUpdate('BANNER', id, String(request.user.id), before as any, response as any);
    return DataSanitizer.sanitizeData(new SuperAdminBannerResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('banners/delete/:id')
  async deleteBanner(@Req() request: any, @Param('id') id: string) {
    const before = await this.bannerService.findOne(id);
    const response = await this.bannerService.remove(id);
    await this.auditService.recordDelete('BANNER', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }

  // ---- App Versions ----

  @ApiOkResponse({ type: SuperAdminAppVersionListResponseDto })
  @Get('app-versions')
  async listAppVersions(@Query('page') page = 1, @Query('limit') limit = 10) {
    const offset = (Number(page) - 1) * Number(limit);
    const response = await this.appVersionService.findAll(offset, Number(limit));
    return DataSanitizer.sanitizeData(new SuperAdminAppVersionListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminAppVersionResponseDto })
  @Get('app-versions/:id')
  async getAppVersion(@Param('id') id: string) {
    const response = await this.appVersionService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminAppVersionResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminAppVersionResponseDto })
  @Post('app-versions')
  async createAppVersion(@Req() request: any, @Body() dto: CreateAppVersionDto) {
    const response = await this.appVersionService.create(dto);
    await this.auditService.recordCreate(
      'APP_VERSION',
      String(response.id),
      String(request.user.id),
      dto as any
    );
    return DataSanitizer.sanitizeData(new SuperAdminAppVersionResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminAppVersionResponseDto })
  @Post('app-versions/:id')
  async updateAppVersion(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateAppVersionDto) {
    const before = await this.appVersionService.findOne(id);
    const response = await this.appVersionService.update(id, dto);
    await this.auditService.recordUpdate(
      'APP_VERSION',
      id,
      String(request.user.id),
      before as any,
      response as any
    );
    return DataSanitizer.sanitizeData(new SuperAdminAppVersionResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('app-versions/delete/:id')
  async deleteAppVersion(@Req() request: any, @Param('id') id: string) {
    const before = await this.appVersionService.findOne(id);
    const response = await this.appVersionService.remove(id);
    await this.auditService.recordDelete('APP_VERSION', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }

  // ---- Videos ----

  @ApiOkResponse({ type: SuperAdminVideoListResponseDto })
  @Get('videos')
  async listVideos(@Query() query: AdminVideoQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const response = await this.videoService.findAll(query, offset, query.limit);
    return DataSanitizer.sanitizeData(new SuperAdminVideoListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminVideoResponseDto })
  @Get('videos/:id')
  async getVideo(@Param('id') id: string) {
    const response = await this.videoService.findOne(id);
    return DataSanitizer.sanitizeData(new SuperAdminVideoResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminVideoResponseDto })
  @Post('videos')
  async createVideo(@Req() request: any, @Body() dto: CreateVideoDto) {
    const response = await this.videoService.create(dto);
    await this.auditService.recordCreate('VIDEO', String(response.id), String(request.user.id), dto as any);
    return DataSanitizer.sanitizeData(new SuperAdminVideoResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminVideoResponseDto })
  @Post('videos/:id')
  async updateVideo(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateVideoDto) {
    const before = await this.videoService.findOne(id);
    const response = await this.videoService.update(id, dto);
    await this.auditService.recordUpdate('VIDEO', id, String(request.user.id), before as any, response as any);
    return DataSanitizer.sanitizeData(new SuperAdminVideoResponseDto(response));
  }

  @ApiOkResponse({ type: MessageResponseDto })
  @Post('videos/delete/:id')
  async deleteVideo(@Req() request: any, @Param('id') id: string) {
    const before = await this.videoService.findOne(id);
    const response = await this.videoService.remove(id);
    await this.auditService.recordDelete('VIDEO', id, String(request.user.id), before as any);
    return DataSanitizer.sanitizeData(new MessageResponseDto(response.message));
  }
}
