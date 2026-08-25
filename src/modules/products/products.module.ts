import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductRepository, ProductVariantRepository, ProductImageRepository } from './repository';
import { CategoriesModule } from '../categories/categories.module';
import { SellerKycModule } from '../seller-kyc/seller-kyc.module';

@Module({
  imports: [CategoriesModule, SellerKycModule],
  providers: [ProductsService, ProductRepository, ProductVariantRepository, ProductImageRepository],
  controllers: [ProductsController],
  exports: [ProductsService, ProductRepository],
})
export class ProductsModule {}
