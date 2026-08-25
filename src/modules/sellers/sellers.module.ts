import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { StoreInformationRepository } from './repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SellersService, StoreInformationRepository],
  controllers: [SellersController],
  exports: [SellersService, StoreInformationRepository],
})
export class SellersModule {}
