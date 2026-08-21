import { Module } from '@nestjs/common';
import { BannerModule } from '../cms/banner/banner.module';
import { DynamicConfigModule } from '../dynamic-config/dynamic-config.module';
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

@Module({
  imports: [BannerModule, DynamicConfigModule],
  controllers: [
    SuperAdminUsersController,
    SuperAdminUserMappingsController,
    SuperAdminReportsController,
    SuperAdminBannersController,
    SuperAdminDynamicConfigController,
  ],
  providers: [
    SuperAdminUsersRepository,
    SuperAdminUsersService,
    SuperAdminUserMappingsRepository,
    SuperAdminUserMappingsService,
    SuperAdminReportsRepository,
    SuperAdminReportsService,
  ],
})
export class SuperAdminModule {}
