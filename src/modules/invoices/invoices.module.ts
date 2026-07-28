import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { ConfigModule } from 'src/default/config/config.module';
import { AppConfigService } from 'src/default/config/config.service';
import { InvoicesController } from './invoices.controller';
import {
  InvoiceHistoryRepository,
  InvoicePairRepository,
  InvoiceRepository,
  InvoiceSessionRepository,
  PairHistoryRepository,
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
  controllers: [InvoicesController],
  providers: [
    InvoiceRepository,
    InvoiceSessionRepository,
    InvoicePairRepository,
    PairHistoryRepository,
    InvoiceHistoryRepository,
    RedisLockService,
    InvoiceValidationService,
    PairValidationService,
    PointCalculationService,
    RewardService,
    AuditService,
    InvoiceAuditProcessor,
    ScanSessionService,
    InvoiceService,
  ],
  exports: [InvoiceService],
})
export class InvoicesModule {}
