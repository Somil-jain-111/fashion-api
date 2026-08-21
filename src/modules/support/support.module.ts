import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportService } from './support.service';
import { SupportRepository } from './repository/support.repository';

@Module({
  controllers: [SupportController, SupportAdminController],
  providers: [SupportRepository, SupportService],
  exports: [SupportService],
})
export class SupportModule {}
