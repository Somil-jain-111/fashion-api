import { Module } from '@nestjs/common';
import { SuperAdminKycController } from './controllers/super-admin-kyc.controller';
import { SuperAdminProductsController } from './controllers/super-admin-products.controller';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminReportsService } from './services/admin-reports.service';
import { ProductsModule } from '../products/products.module';
import { SellerKycModule } from '../seller-kyc/seller-kyc.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ProductsModule, SellerKycModule, AuthModule],
  providers: [AdminReportsService],
  controllers: [SuperAdminKycController, SuperAdminProductsController, AdminReportsController],
})
export class AdminModule {}
