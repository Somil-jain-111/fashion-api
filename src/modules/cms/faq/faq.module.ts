import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { FaqHelper } from './helpers/faq.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';

@Module({
  controllers: [FaqController],
  providers: [FaqService, FaqHelper, UserAuthValidator],
  exports: [FaqService, FaqHelper],
})
export class FaqModule {}
