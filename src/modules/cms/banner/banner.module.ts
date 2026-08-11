import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { BannerHelper } from './helpers/banner.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { BannerRepository, RolesRepository, UserRepository } from 'src/modules/auth/repository';
import { CmsPageHelper } from '../cms-page/helpers/cms-page.helper';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [BannerController],
  providers: [
    BannerService,
    BannerHelper,
    UserAuthValidator,
    UserRepository,
    RolesRepository,
    CmsPageHelper,
    BannerRepository,
  ],
  exports: [BannerService, BannerHelper],
})
export class BannerModule {}
