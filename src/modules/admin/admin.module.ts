import { Module } from '@nestjs/common';
import { SuperAdminKycController } from './controllers/super-admin-kyc.controller';
import { SuperAdminProductsController } from './controllers/super-admin-products.controller';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminReportsService } from './services/admin-reports.service';
import { ProductsModule } from '../products/products.module';
import { SellersModule } from '../sellers/sellers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ProductsModule, SellersModule, AuthModule],
  providers: [AdminReportsService],
  controllers: [SuperAdminKycController, SuperAdminProductsController, AdminReportsController],
})
export class AdminModule {}
