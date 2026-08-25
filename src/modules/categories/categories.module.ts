import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryRepository } from './repository';
import { SellerKycModule } from '../seller-kyc/seller-kyc.module';

@Module({
  imports: [SellerKycModule],
  providers: [CategoriesService, CategoryRepository],
  controllers: [CategoriesController],
  exports: [CategoriesService, CategoryRepository],
})
export class CategoriesModule {}
