import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { ConfigModule } from 'src/default/config/config.module';
import { AppConfigService } from 'src/default/config/config.service';
import { InvoicesController } from './invoices.controller';
import {
  InvoiceHistoryRepository,
  InvoicePointHistoryRepository,
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
  UserRewardRepository,
  RetailerScanAgeRepository,
  MasterCatalogueRepository,
  InvoiceExceptionRepository,
  ScanAuditRepository,
  InvoiceItemRepository,
} from './repository';
import {
  AuditService,
  InvoiceAuditProcessor,
  InvoiceService,
  InvoiceValidationService,
  PairValidationService,
  PointCalculationService,
  RedisLockService,
  RewardService,
  ScanSessionService,
} from './services';
import { InvoiceAuditService } from './services/invoice-audit.service';
import { RetailerScanAgeService } from './services/retailer-scan-age.service';
import { RateValidationService } from './services/rate-validation.service';
import { SkuQuantityValidationService } from './services/sku-quantity-validation.service';
import { InvoiceExceptionService } from './services/invoice-exception.service';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { PointsExpiryConfigService } from '../redemptions/services/points-expiry.service';
import { InvoiceExceptionsController } from './invoice-exceptions.controller';
import { RetailerScanAgeController } from './retailer-scan-age.controller';

@Module({
  imports: [
    RedisModule,
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST') || '127.0.0.1',
          port: Number(config.get('REDIS_PORT')) || 6379,
          password: config.get('REDIS_PASSWORD') || undefined,
          db: Number(config.get('REDIS_DB')) || 0,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'invoice-audit' }),
  ],
  controllers: [InvoicesController, InvoiceExceptionsController, RetailerScanAgeController ],
  providers: [
    InvoiceRepository,
    InvoiceSessionRepository,
    InvoicePairRepository,
    PairHistoryRepository,
    InvoiceHistoryRepository,
    UserRewardRepository,
    InvoicePointHistoryRepository,
    RedisLockService,
    InvoiceValidationService,
    PairValidationService,
    PointCalculationService,
    RewardService,
    AuditService,
    InvoiceAuditProcessor,
    ScanSessionService,
    InvoiceService,

    RetailerScanAgeRepository,
    MasterCatalogueRepository,
    InvoiceExceptionRepository,
    ScanAuditRepository,
    InvoiceItemRepository,

    InvoiceAuditService,
    RetailerScanAgeService,
    RateValidationService,
    SkuQuantityValidationService,
    InvoiceExceptionService,
    SystemConfigRepository,
    PointsExpiryConfigService
  ],
  exports: [InvoiceService],
})
export class InvoicesModule {}
