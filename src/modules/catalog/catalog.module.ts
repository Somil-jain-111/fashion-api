import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { AuthModule } from '../auth/auth.module';
import { SellerKycModule } from '../seller-kyc/seller-kyc.module';

@Module({
  imports: [ProductsModule, CategoriesModule, AuthModule, SellerKycModule],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
