import { Module } from '@nestjs/common';
import { CmsPageService } from './cms-page.service';
import { CmsPageController } from './cms-page.controller';
import { CmsPageHelper } from './helpers/cms-page.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { CmsPageRepository } from './repository/cms-page.repository';
import { RolesRepository, UserRepository } from 'src/modules/auth/repository';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [CmsPageController],
  providers: [
    CmsPageService,
    CmsPageHelper,
    UserAuthValidator,
    CmsPageRepository,
    RolesRepository,
    UserRepository,
  ],
  exports: [CmsPageService, CmsPageHelper],
})
export class CmsPageModule {}
