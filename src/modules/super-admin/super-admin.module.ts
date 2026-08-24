import { Module } from '@nestjs/common';
import { BannerModule } from '../cms/banner/banner.module';
import { DynamicConfigModule } from '../dynamic-config/dynamic-config.module';
import { RewardsModule } from '../rewards/rewards.module';
import { SupportModule } from '../support/support.module';
import { CmsPageModule } from '../cms/cms-page/cms-page.module';
import { FaqModule } from '../cms/faq/faq.module';
import { AnnouncementModule } from '../cms/announcement/announcement.module';
import { AppVersionModule } from '../cms/app-version/app-version.module';
import { VideoModule } from '../cms/video/video.module';
import { AuditModule } from '../audit/audit.module';
import { AddressesModule } from '../addresses/addresses.module';
import { SuperAdminUsersController } from './users/super-admin-users.controller';
import { SuperAdminUsersService } from './users/super-admin-users.service';
import { SuperAdminUsersRepository } from './users/repository/super-admin-users.repository';
import { SuperAdminUserMappingsController } from './user-mappings/super-admin-user-mappings.controller';
import { SuperAdminUserMappingsService } from './user-mappings/super-admin-user-mappings.service';
import { SuperAdminUserMappingsRepository } from './user-mappings/repository/super-admin-user-mappings.repository';
import { SuperAdminReportsController } from './reports/super-admin-reports.controller';
import { SuperAdminReportsService } from './reports/super-admin-reports.service';
import { SuperAdminReportsRepository } from './reports/repository/super-admin-reports.repository';
import { SuperAdminBannersController } from './banners/super-admin-banners.controller';
import { SuperAdminDynamicConfigController } from './dynamic-config/super-admin-dynamic-config.controller';
import { SuperAdminRewardsController } from './rewards/super-admin-rewards.controller';
import { SuperAdminDistributorReturnController } from './distributor-return/super-admin-distributor-return.controller';
import { SuperAdminDistributorReturnService } from './distributor-return/super-admin-distributor-return.service';
import { SuperAdminDistributorReturnRepository } from './distributor-return/repository/super-admin-distributor-return.repository';
import { SuperAdminDistributorTransferController } from './distributor-transfer/super-admin-distributor-transfer.controller';
import { SuperAdminDistributorTransferService } from './distributor-transfer/super-admin-distributor-transfer.service';
import { SuperAdminDistributorTransferRepository } from './distributor-transfer/repository/super-admin-distributor-transfer.repository';
import { SuperAdminSupportController } from './support/super-admin-support.controller';
import { SuperAdminCmsController } from './cms/super-admin-cms.controller';
import { SuperAdminNotificationTemplatesModule } from './notification-templates/super-admin-notification-templates.module';

@Module({
  imports: [
    BannerModule,
    DynamicConfigModule,
    RewardsModule,
    SupportModule,
    CmsPageModule,
    FaqModule,
    AnnouncementModule,
    AppVersionModule,
    VideoModule,
    AuditModule,
    AddressesModule,
    SuperAdminNotificationTemplatesModule,
  ],
  controllers: [
    SuperAdminUsersController,
    SuperAdminUserMappingsController,
    SuperAdminReportsController,
    SuperAdminBannersController,
    SuperAdminDynamicConfigController,
    SuperAdminRewardsController,
    SuperAdminDistributorReturnController,
    SuperAdminDistributorTransferController,
    SuperAdminSupportController,
    SuperAdminCmsController,
  ],
  providers: [
    SuperAdminUsersRepository,
    SuperAdminUsersService,
    SuperAdminUserMappingsRepository,
    SuperAdminUserMappingsService,
    SuperAdminReportsRepository,
    SuperAdminReportsService,
    SuperAdminDistributorReturnRepository,
    SuperAdminDistributorReturnService,
    SuperAdminDistributorTransferRepository,
    SuperAdminDistributorTransferService,
  ],
})
export class SuperAdminModule {}
