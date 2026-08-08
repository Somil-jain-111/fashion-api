import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from './default/config/config.module';
import { SqlDbModule } from './default/databases/mysql/sqldb.module';
// import { MongodbModule } from "./default/databases/mongodb/mongodb.module";
import { RedisModule } from './default/databases/redis/redis.module';
import { AppController } from './app.controller';
import { AppCacheModule } from './default/cache/cache.module';
import { SwaggerModule } from './default/swagger/swagger.module';
import { HttpModule } from '@nestjs/axios';
import { ErrorHandlingModule } from './default/error/error.module';
import { NotFoundMiddleware } from './default/common/middleware/not-found.middleware';
import { ValidationPipe } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UnifiedResponseInterceptor } from './default/common/interceptors/unified-response.interceptor';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigService } from './default/config/config.service';
import { LoggerModule } from './default/logger/console/console.module';
import { CloudwatchModule } from './default/logger/cloudwatch/cloudwatch.module';
import { LocalStorageInterceptor } from './default/common/interceptors/local-storage.interceptor';
import { IdempotencyModule } from './default/idempotency/idempotency.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullSetupModule } from './bull/bull.module';
// import { MediaService } from './modules/media/media.service';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { KycModule } from './modules/kyc/kyc.module';
import { JourneyIdMiddleware } from './default/common/middleware/journey-id.middleware';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { RedemptionsModule } from './modules/redemptions/redemptions.module';
import { SupportModule } from './modules/support/support.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { RoutesModule } from './modules/routes/routes.module';
import { VisitsModule } from './modules/visits/visits.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { PublicModule } from './modules/public/public.module';
import { PaymentModule } from './modules/payment/payment.module';
// import { OnboardingApprovalModule } from './modules/onboarding-approval/onboarding-approval.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SoVerificationModule } from './modules/so-verification/so-verification.module';
import { S3Module } from './default/common/services/s3/s3.module';
import { DynamicConfigModule } from './modules/dynamic-config/dynamic-config.module';
import { CmsModule } from './modules/cms/cms.module';
import { OrderPlacementModule } from './modules/order-placement/order-placement.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { AdminModule } from './modules/admin/admin.module';
import { RedemptionCartModule } from './modules/redemption-cart/redemption-cart.module';
import { SmsModule } from './modules/sms/sms.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule,
    LoggerModule,
    SqlDbModule,
    // MongodbModule,
    RedisModule,
    AppCacheModule,
    SwaggerModule,
    HttpModule,
    ErrorHandlingModule,
    CloudwatchModule,
    IdempotencyModule,
    BullSetupModule,
    AuditModule,
    AuthModule,
    KycModule,
    InvoicesModule,
    RewardsModule,
    RedemptionsModule,
    SupportModule,
    ComplaintsModule,
    RoutesModule,
    VisitsModule,
    ApprovalsModule,
    AddressesModule,
    PublicModule,
    PaymentModule,
    // OnboardingApprovalModule,
    OnboardingModule,
    SoVerificationModule,
    S3Module,
    DynamicConfigModule,
    CmsModule,
    OrderPlacementModule,
    ProductsModule,
    CartModule,
    EmployeeModule,
    AdminModule,
    RedemptionCartModule,
    SmsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
      useValue: {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      },
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UnifiedResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LocalStorageInterceptor,
    },
    AppConfigService,
    // MediaService,
  ],
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NotFoundMiddleware, JourneyIdMiddleware)
      .exclude({ path: '/api/v1/users', method: RequestMethod.ALL })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
