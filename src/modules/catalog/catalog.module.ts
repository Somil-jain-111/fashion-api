import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { AuthModule } from '../auth/auth.module';
import { SellersModule } from '../sellers/sellers.module';
import { ProductBoostModule } from '../product-boost/product-boost.module';

@Module({
  imports: [ProductsModule, CategoriesModule, AuthModule, SellersModule, ProductBoostModule],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
