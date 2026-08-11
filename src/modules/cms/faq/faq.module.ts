import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { FaqHelper } from './helpers/faq.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { FaqRepository } from './repository/faq.repository';
import { RolesRepository, UserRepository } from 'src/modules/auth/repository';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [FaqController],
  providers: [
    FaqService,
    FaqHelper,
    UserAuthValidator,
    FaqRepository,
    RolesRepository,
    UserRepository,
  ],
  exports: [FaqService, FaqHelper],
})
export class FaqModule {}
