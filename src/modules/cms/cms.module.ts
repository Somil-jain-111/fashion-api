import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { BannerModule } from './banner/banner.module';
import { CmsPageModule } from './cms-page/cms-page.module';
import { FaqModule } from './faq/faq.module';
import { AppVersionModule } from './app-version/app-version.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { UserRepository, RolesRepository } from '../auth/repository';

@Module({
  imports: [BannerModule, CmsPageModule, FaqModule, AppVersionModule, AnnouncementModule],
  controllers: [CmsController],
  providers: [CmsService, UserAuthValidator, UserRepository, RolesRepository],
  exports: [CmsService],
})
export class CmsModule {}
