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
  PairValidationService,
  PointCalculationService,
  RedisLockService,
  RewardService,
} from './services';
import { InvoiceValidationService } from './services/invoice-validation.service';
import { ScanSessionService } from './services/scan-session.service';
import { PairScanningService } from './services/pair-scanning.service';
import { RewardSettlementService } from './services/reward-settlement.service';
import { InvoiceAuditService } from './services/invoice-audit.service';
import { RetailerScanAgeService } from './services/retailer-scan-age.service';
import { RateValidationService } from './services/rate-validation.service';
import { SkuQuantityValidationService } from './services/sku-quantity-validation.service';
import { InvoiceExceptionService } from './services/invoice-exception.service';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { PointsExpiryConfigService } from '../redemptions/services/points-expiry.service';
import { InvoiceExceptionsController } from './invoice-exceptions.controller';
import { RetailerScanAgeController } from './retailer-scan-age.controller';
import { InvoiceIngestionController } from './invoice-ingestion.controller';
import { InvoiceIngestionRepository } from './repository/invoice-ingestion.repository';
import { InvoiceIngestionService } from './services/invoice-ingestion.service';
import { UserModule } from '../user/user.module';
import { UserMappingRepository } from '../auth/repository/user-mapping.repository';
import { IdempotencyModule } from 'src/default/idempotency/idempotency.module';
import { SubDistributorInvoiceController } from './sub-distributor-invoices.controller';
import { SubDistributorStockRepository } from './repository/sub-distributor-stock.repository';
import { SubDistributorStockSettlementService } from './services/sub-distributor-stock-settlement.service';
import { NotificationsModule } from '../notifications/notifications.module';

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
    UserModule,
    IdempotencyModule,
    NotificationsModule,
  ],
  controllers: [
    InvoicesController,
    InvoiceExceptionsController,
    RetailerScanAgeController,
    InvoiceIngestionController,
    SubDistributorInvoiceController,
  ],
  providers: [
    InvoiceRepository,
    InvoiceSessionRepository,
    InvoicePairRepository,
    PairHistoryRepository,
    InvoiceHistoryRepository,
    UserRewardRepository,
    InvoicePointHistoryRepository,
    UserMappingRepository,
    RedisLockService,
    InvoiceValidationService,
    ScanSessionService,
    PairScanningService,
    RewardSettlementService,
    PairValidationService,
    PointCalculationService,
    RewardService,
    AuditService,
    InvoiceAuditProcessor,
    InvoiceService,

    SubDistributorStockRepository,
    SubDistributorStockSettlementService,

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
    PointsExpiryConfigService,

    InvoiceIngestionRepository,
    InvoiceIngestionService,
  ],
  exports: [
    RedisLockService,
    InvoiceService,
    InvoiceValidationService,
    ScanSessionService,
    PairScanningService,
    RewardSettlementService,
  ],
})
export class InvoicesModule {}
