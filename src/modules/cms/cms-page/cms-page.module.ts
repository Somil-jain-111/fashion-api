import { Module } from '@nestjs/common';
import { CmsPageService } from './cms-page.service';
import { CmsPageController } from './cms-page.controller';
import { CmsPageHelper } from './helpers/cms-page.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';

@Module({
  controllers: [CmsPageController],
  providers: [CmsPageService, CmsPageHelper, UserAuthValidator],
  exports: [CmsPageService, CmsPageHelper]
})
export class CmsPageModule {}
