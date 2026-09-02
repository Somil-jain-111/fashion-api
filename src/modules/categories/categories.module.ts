import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryRepository } from './repository';
import { SellersModule } from '../sellers/sellers.module';
import { ContentAuditRepository } from 'src/default/common/repositories/content-audit.repository';
import { SuperAdminCategoriesController } from './super-admin-categories.controller';

@Module({
  imports: [SellersModule],
  providers: [CategoriesService, CategoryRepository, ContentAuditRepository],
  controllers: [CategoriesController, SuperAdminCategoriesController],
  exports: [CategoriesService, CategoryRepository],
})
export class CategoriesModule {}
