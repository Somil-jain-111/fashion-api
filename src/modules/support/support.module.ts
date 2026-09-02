import { Module } from '@nestjs/common';
import { AdminSupportController, SellerSupportController } from './support.controller';
import { SupportRepository } from './support.repository';
import { SupportService } from './support.service';

@Module({
  controllers: [SellerSupportController, AdminSupportController],
  providers: [SupportService, SupportRepository],
  exports: [SupportService],
})
export class SupportModule {}
