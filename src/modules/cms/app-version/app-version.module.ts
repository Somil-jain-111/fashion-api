import { Module } from '@nestjs/common';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { AppVersionHelper } from './helpers/app-version.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { AppVersionRepository } from './repository/app-version.repository';
import { UserRepository } from 'src/modules/auth/repository';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [AppVersionController],
  providers: [
    AppVersionService,
    AppVersionHelper,
    UserAuthValidator,
    AppVersionRepository,
    AppVersionHelper,
    UserRepository,
  ],
  exports: [AppVersionService, AppVersionHelper],
})
export class AppVersionModule {}
