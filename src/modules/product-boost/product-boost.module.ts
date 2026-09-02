import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { ProductBoostController } from './product-boost.controller';
import { ProductBoostRepository } from './product-boost.repository';
import { ProductBoostService } from './product-boost.service';
import { SellersModule } from '../sellers/sellers.module';
import { ConfigModule } from '../../default/config/config.module';

@Module({
  imports: [AuthModule, ProductsModule, SellersModule, ConfigModule],
  providers: [ProductBoostService, ProductBoostRepository],
  controllers: [ProductBoostController],
  exports: [ProductBoostService, ProductBoostRepository],
})
export class ProductBoostModule {}
