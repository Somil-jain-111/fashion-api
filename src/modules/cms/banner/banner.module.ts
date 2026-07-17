import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { BannerHelper } from './helpers/banner.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';

@Module({
  controllers: [BannerController],
  providers: [BannerService, BannerHelper, UserAuthValidator],
  exports: [BannerService, BannerHelper]
})
export class BannerModule {}
