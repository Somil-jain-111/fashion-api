import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { VideoRepository } from './repository/video.repository';
import { RolesRepository, UserRepository } from 'src/modules/auth/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [VideoController],
  providers: [VideoService, VideoRepository, RolesRepository, UserRepository, UserAuthValidator],
  exports: [VideoService],
})
export class VideoModule {}
