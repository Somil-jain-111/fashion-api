import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import {
  ProductRepository,
  ProductVariantRepository,
  ProductImageRepository,
  ProductOptionRepository,
} from './repository';
import { CategoriesModule } from '../categories/categories.module';
import { SellersModule } from '../sellers/sellers.module';
import { ContentAuditRepository } from 'src/default/common/repositories/content-audit.repository';

@Module({
  imports: [CategoriesModule, SellersModule],
  providers: [
    ProductsService,
    ProductRepository,
    ProductVariantRepository,
    ProductImageRepository,
    ProductOptionRepository,
    ContentAuditRepository,
  ],
  controllers: [ProductsController],
  exports: [ProductsService, ProductRepository],
})
export class ProductsModule {}
