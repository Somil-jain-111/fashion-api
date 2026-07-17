import { Module } from '@nestjs/common';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { AppVersionHelper } from './helpers/app-version.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';

@Module({
  controllers: [AppVersionController],
  providers: [AppVersionService,AppVersionHelper,UserAuthValidator],
  exports: [AppVersionService, AppVersionHelper]
})
export class AppVersionModule {}
