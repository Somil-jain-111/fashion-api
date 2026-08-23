import { Module } from '@nestjs/common';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { CustomerReturnController } from './customer-return.controller';
import { CustomerReturnService } from './customer-return.service';
import { CustomerReturnRepository } from './repository/customer-return.repository';
import { InvoicePairRepository } from '../invoices/repository';
import { RedisLockService } from '../invoices/services/redis-lock.service';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';

@Module({
  imports: [RedisModule],
  controllers: [CustomerReturnController],
  providers: [
    IdempotencyService,
    IdempotencyInterceptor,
    CustomerReturnRepository,
    InvoicePairRepository,
    RedisLockService,
    CustomerReturnService,
  ],
  exports: [
    IdempotencyService,
    IdempotencyInterceptor,
    CustomerReturnService,
    CustomerReturnRepository,
  ],
})
export class CustomerReturnModule {}
