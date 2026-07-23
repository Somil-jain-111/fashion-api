import { Injectable } from '@nestjs/common';

import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { BannerService } from './banner/banner.service';
import { AnnouncementService } from './announcement/announcement.service';
import { AppVersionService } from './app-version/app-version.service';
import { CmsPageService } from './cms-page/cms-page.service';
import { FaqService } from './faq/faq.service';
import { CmsHomeQueryDto } from './dto/cms-home-query.dto';

@Injectable()
export class CmsService {
  constructor(
    private readonly bannerService: BannerService,
    private readonly announcementService: AnnouncementService,
    private readonly appVersionService: AppVersionService,
    private readonly cmsPageService: CmsPageService,
    private readonly faqService: FaqService
  ) {}

  async getHomeConfig(roleIds: string[], userRole: any, query: CmsHomeQueryDto): Promise<any> {
    const tag = 'CmsService.getHomeConfig';

    ConsoleLogger.log('CMS_HOME_CONFIG_START', {
      tag,
      data: {
        roleIds,
        userRole,
        query,
      },
    });

    const [banners, announcements, cmsPages, faqs, appVersion] = await Promise.all([
      this.bannerService.getActiveBannersByRoleIds(roleIds, query.bannerPosition as any),

      this.announcementService.getActiveAnnouncementsByRoleIds(roleIds),

      this.cmsPageService.getActiveCmsPagesByRoleIds(roleIds),

      this.faqService.findAll({}, 0, 10, userRole),

      query.platform && query.version
        ? this.appVersionService.checkVersion({
            platform: query.platform,
            version: query.version,
          })
        : Promise.resolve(null),
    ]);

    const response = {
      banners,
      announcements,
      appVersion,
      cmsPages,
      faqs: faqs?.faqs ?? [],
    };

    ConsoleLogger.log('CMS_HOME_CONFIG_SUCCESS', {
      tag,
      data: {
        bannerCount: banners.length,
        announcementCount: announcements.length,
        cmsPageCount: cmsPages.length,
        faqCount: response.faqs.length,
      },
    });

    return response;
  }

  async getConfig(roleIds: string[], userRole: any, query: CmsHomeQueryDto): Promise<any> {
    return this.getHomeConfig(roleIds, userRole, query);
  }

  async getSettings(): Promise<any> {
    return {
      maintenance: {
        enabled: false,
      },
      features: {
        banners: true,
        announcements: true,
        faqs: true,
        cmsPages: true,
        appVersion: true,
      },
    };
  }
}
